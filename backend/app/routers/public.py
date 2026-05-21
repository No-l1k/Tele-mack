import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Order, OrderItem, Product, Setting
from ..schemas import ApiResponse, ContactRequestIn, QuickOrderCreateIn
from ..services.notifications import email_notifications_enabled, send_contact_request_email, send_new_order_email
from ..services.order_numbers import allocate_next_order_id
from ..services.products import product_available_for_order
from ..services.store_settings import min_order_subtotal_rub, normalize_delivery_info
from ..pricing_constants import COURIER_DELIVERY_COST_RUB
from ..services.checkout_services import DEFAULT_CHECKOUT_SERVICES, normalize_checkout_services

router = APIRouter(prefix="/public", tags=["public"])
logger = logging.getLogger(__name__)

DEFAULT_STORE_SETTINGS = {
    "name": "Tele-makc",
    "phone": "+7(900)000-00-00",
    "email": "shop@example.com",
    "address": "Москва",
    "workingHours": "Пн-Вс: 9:00-21:00",
    "deliveryInfo": {"moscowFree": True, "moscowMinSum": 4000, "regionCostPerKm": 50, "deliveryDays": "1-3 дня"},
    "paymentMethods": {"cash": True, "card": True, "cardSurcharge": 15, "pickup": True},
    "social": {"whatsapp": "+79000000000", "telegram": "@telemakc"},
    "heroBanners": [],
    "checkoutServices": DEFAULT_CHECKOUT_SERVICES,
}


def _normalize_hero_banners(value: object) -> list[dict[str, str]]:
    items = value if isinstance(value, list) else []
    normalized: list[dict[str, str]] = []
    for item in items:
        if isinstance(item, str):
            image = item.strip()
            if image:
                normalized.append({"image": image, "href": ""})
            continue
        if isinstance(item, dict):
            image = str(item.get("image", "")).strip()
            if not image:
                continue
            href = str(item.get("href", "")).strip()
            normalized.append({"image": image, "href": href})
    return normalized


@router.get("/settings", response_model=ApiResponse)
def get_public_store_settings(db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == "store").first()
    if not row:
        row = Setting(key="store", value=DEFAULT_STORE_SETTINGS.copy())
        db.add(row)
        db.commit()
        db.refresh(row)
    settings_data = dict(row.value or {})
    normalized_delivery = normalize_delivery_info(settings_data.get("deliveryInfo"))
    if settings_data.get("deliveryInfo") != normalized_delivery:
        settings_data["deliveryInfo"] = normalized_delivery
    settings_data["heroBanners"] = _normalize_hero_banners(settings_data.get("heroBanners"))
    raw_services = settings_data.get("checkoutServices")
    settings_data["checkoutServices"] = normalize_checkout_services(
        raw_services if "checkoutServices" in settings_data else None
    )
    if settings_data != row.value:
        row.value = settings_data
        db.commit()
        db.refresh(row)
    return ApiResponse(data=row.value)


@router.post("/contact", response_model=ApiResponse)
def send_contact_request(payload: ContactRequestIn):
    if not email_notifications_enabled():
        raise HTTPException(status_code=503, detail="Contact notifications are not configured")

    try:
        send_contact_request_email(
            name=payload.name.strip(),
            phone=payload.phone.strip(),
            email=(payload.email or "").strip() or None,
            subject=(payload.subject or "").strip() or None,
            message=payload.message.strip(),
        )
    except Exception as exc:
        logger.exception("Failed to send contact request email")
        raise HTTPException(status_code=500, detail="Не удалось отправить сообщение. Попробуйте позже.") from exc

    return ApiResponse(message="Сообщение отправлено")


@router.post("/quick-order", response_model=ApiResponse)
def create_quick_order(payload: QuickOrderCreateIn, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == payload.productId).with_for_update().first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    if not product_available_for_order(product):
        raise HTTPException(status_code=400, detail="Товар сейчас недоступен для заказа")

    quantity = payload.quantity
    line_total = int(product.price) * quantity
    min_sum = min_order_subtotal_rub(db)
    if line_total < min_sum:
        raise HTTPException(
            status_code=400,
            detail=f"Минимальная сумма заказа {min_sum} руб.",
        )
    images = (product.specs or {}).get("images", [])
    comment = (payload.comment or "").strip()
    order_comment = f"Покупка в 1 клик. Комментарий клиента: {comment}" if comment else "Покупка в 1 клик"

    order = Order(
        id=allocate_next_order_id(db),
        status="pending",
        total=line_total + COURIER_DELIVERY_COST_RUB,
        payment_status="pending",
        delivery_method="courier",
        payment_method="cash",
        customer_name=payload.name.strip(),
        customer_phone=payload.phone.strip(),
        comment=order_comment,
        items=[
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_image=images[0] if images else None,
                product_sku=(product.sku or "").strip() or None,
                price=int(product.price),
                quantity=quantity,
                total=line_total,
            )
        ],
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    if email_notifications_enabled():
        try:
            send_new_order_email(order)
        except Exception:
            logger.exception("Failed to send quick order notification email for order_id=%s", order.id)

    return ApiResponse(data={"orderId": order.id, "number": order.id}, message="Заявка отправлена")
