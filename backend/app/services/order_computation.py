"""Расчёт состава заказа и итогов (создание и редактирование)."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import OrderItem, Product
from ..pricing_constants import COURIER_DELIVERY_COST_RUB
from ..schemas import OrderItemCreate
from ..services.checkout_services import checkout_services_map_from_settings
from ..services.products import product_available_for_order
from ..services.tv_checkout_services import (
    LEGACY_TV_CHECKOUT_SERVICE_IDS,
    resolve_tv_checkout_service,
)

COURIER_DELIVERY_COST = COURIER_DELIVERY_COST_RUB


@dataclass
class OrderComputation:
    order_items: list[OrderItem]
    subtotal: int
    surcharge: int
    services_total: int
    delivery_cost: int
    total: int
    selected_services: list[dict[str, object]]
    pixel_check: bool
    installation: bool


def _checkout_services_map(db: Session, settings_data: dict | None = None) -> dict[str, dict[str, object]]:
    if settings_data is not None:
        return checkout_services_map_from_settings(settings_data)
    from ..models import Setting

    row = db.query(Setting).filter(Setting.key == "store").first()
    store = dict(row.value or {}) if row else {}
    return checkout_services_map_from_settings(store)


def build_order_lines(
    db: Session,
    items: list[OrderItemCreate],
    *,
    check_availability: bool = True,
    lock_products: bool = False,
) -> tuple[list[OrderItem], int, dict[int, Product], dict[int, int]]:
    if not items:
        raise HTTPException(status_code=400, detail="В заказе должен быть хотя бы один товар")

    subtotal = 0
    order_items: list[OrderItem] = []
    products_by_id: dict[int, Product] = {}
    quantities_by_product: dict[int, int] = {}

    for item in items:
        quantity = item.quantity
        query = db.query(Product).filter(Product.id == item.productId)
        if lock_products:
            query = query.with_for_update()
        product = query.first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product not found: {item.productId}")
        if check_availability and not product_available_for_order(product):
            raise HTTPException(
                status_code=400,
                detail=f"Товар «{product.name}» сейчас недоступен для заказа",
            )

        price = int(product.price)
        line_total = quantity * price
        subtotal += line_total
        products_by_id[product.id] = product
        quantities_by_product[product.id] = quantities_by_product.get(product.id, 0) + quantity

        images = (product.specs or {}).get("images", [])
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_image=images[0] if images else None,
                product_sku=(product.sku or "").strip() or None,
                price=price,
                quantity=quantity,
                total=line_total,
            )
        )

    return order_items, subtotal, products_by_id, quantities_by_product


def resolve_selected_services(
    db: Session,
    *,
    products_by_id: dict[int, Product],
    quantities_by_product: dict[int, int],
    service_ids: set[str],
    pixel_check: bool,
    installation: bool,
    settings_data: dict | None = None,
) -> list[dict[str, object]]:
    selected_service_ids = set(service_ids)
    if pixel_check:
        selected_service_ids.add("pixel-check")
    if installation:
        selected_service_ids.add("installation")

    services_map = _checkout_services_map(db, settings_data)
    selected_services: list[dict[str, object]] = []
    for service_id in selected_service_ids:
        tv_service = resolve_tv_checkout_service(service_id, products_by_id, quantities_by_product)
        if tv_service:
            selected_services.append(tv_service)
            continue
        static_service = services_map.get(service_id)
        if static_service and service_id not in LEGACY_TV_CHECKOUT_SERVICE_IDS:
            selected_services.append(static_service)

    return selected_services


def compute_order(
    db: Session,
    *,
    items: list[OrderItemCreate],
    payment_method: str,
    delivery_method: str,
    service_ids: list[str] | None = None,
    pixel_check: bool = False,
    installation: bool = False,
    check_availability: bool = True,
    lock_products: bool = False,
    settings_data: dict | None = None,
) -> OrderComputation:
    order_items, subtotal, products_by_id, quantities_by_product = build_order_lines(
        db,
        items,
        check_availability=check_availability,
        lock_products=lock_products,
    )

    selected_services = resolve_selected_services(
        db,
        products_by_id=products_by_id,
        quantities_by_product=quantities_by_product,
        service_ids=set(service_ids or []),
        pixel_check=pixel_check,
        installation=installation,
        settings_data=settings_data,
    )

    surcharge = int(subtotal * 0.15) if payment_method == "card" else 0
    services_total = sum(int(service["price"]) for service in selected_services)
    has_tv_pixel = any(str(s.get("id", "")).startswith("tv-pixel:") for s in selected_services)
    has_tv_install = any(str(s.get("id", "")).startswith("tv-install:") for s in selected_services)
    delivery_cost = COURIER_DELIVERY_COST if delivery_method == "courier" else 0
    total = subtotal + surcharge + services_total + delivery_cost

    return OrderComputation(
        order_items=order_items,
        subtotal=subtotal,
        surcharge=surcharge,
        services_total=services_total,
        delivery_cost=delivery_cost,
        total=total,
        selected_services=selected_services,
        pixel_check=has_tv_pixel or ("pixel-check" in (service_ids or [])) or pixel_check,
        installation=has_tv_install or ("installation" in (service_ids or [])) or installation,
    )
