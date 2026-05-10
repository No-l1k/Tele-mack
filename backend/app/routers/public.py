import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Order, OrderItem, Product, Setting
from ..schemas import ApiResponse, ContactRequestIn, QuickOrderCreateIn
from ..services.notifications import email_notifications_enabled, send_contact_request_email, send_new_order_email

router = APIRouter(prefix="/public", tags=["public"])
logger = logging.getLogger(__name__)

DEFAULT_STORE_SETTINGS = {
    "name": "Tele-makc",
    "phone": "+7(900)000-00-00",
    "email": "shop@example.com",
    "address": "Москва",
    "workingHours": "Пн-Вс: 9:00-21:00",
    "deliveryInfo": {"moscowFree": True, "moscowMinSum": 1, "regionCostPerKm": 50, "deliveryDays": "1-3 дня"},
    "paymentMethods": {"cash": True, "card": True, "cardSurcharge": 15, "pickup": True},
    "social": {"whatsapp": "+79000000000", "telegram": "@telemakc"},
    "heroBanners": [],
    "checkoutServices": [
        {
            "id": "pixel-check",
            "name": "Проверка на битые пиксели",
            "price": 1500,
            "description": "Проверка экрана на наличие дефектных пикселей перед выдачей.",
            "enabled": True,
            "sortOrder": 1,
        },
        {
            "id": "installation",
            "name": "Установка телевизора",
            "price": 3000,
            "description": "Профессиональная установка и базовая настройка телевизора.",
            "enabled": True,
            "sortOrder": 2,
        },
        {
            "id": "bracket-selection",
            "name": "Подбор кронштейна для ТВ",
            "price": 0,
            "description": "подробнее",
            "enabled": True,
            "sortOrder": 3,
        },
        {
            "id": "extended-warranty-2y",
            "name": "Расширенная гарантия на 2 года",
            "price": 1843,
            "description": "Все заботы по ремонту мы возьмем на себя в течение 2 лет. Если товар не подлежит ремонту, обменяем его на новый той же модели.",
            "enabled": True,
            "sortOrder": 4,
        },
        {
            "id": "extended-warranty-3y",
            "name": "Расширенная гарантия на 3 года",
            "price": 2765,
            "description": "Все заботы по ремонту мы возьмем на себя в течение 3 лет. Если товар не подлежит ремонту, обменяем его на новый той же модели.",
            "enabled": True,
            "sortOrder": 5,
        },
    ],
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


def _normalize_checkout_services(value: object) -> list[dict[str, object]]:
    def _normalize_list(raw: object) -> list[dict[str, object]]:
        items = raw if isinstance(raw, list) else []
        normalized_list: list[dict[str, object]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            service_id = str(item.get("id", "")).strip()
            name = str(item.get("name", "")).strip()
            if not service_id or not name:
                continue
            normalized_list.append(
                {
                    "id": service_id,
                    "name": name,
                    "price": max(int(item.get("price", 0) or 0), 0),
                    "description": str(item.get("description", "")).strip() or None,
                    "enabled": bool(item.get("enabled", True)),
                    "sortOrder": int(item.get("sortOrder", 0) or 0),
                }
            )
        return normalized_list

    default_services = _normalize_list(DEFAULT_STORE_SETTINGS["checkoutServices"])
    normalized = _normalize_list(value)
    merged: dict[str, dict[str, object]] = {str(service["id"]): service for service in default_services}
    for service in normalized:
        merged[str(service["id"])] = service
    return sorted(list(merged.values()), key=lambda service: int(service["sortOrder"]))


@router.get("/settings", response_model=ApiResponse)
def get_public_store_settings(db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == "store").first()
    if not row:
        row = Setting(key="store", value=DEFAULT_STORE_SETTINGS.copy())
        db.add(row)
        db.commit()
        db.refresh(row)
    settings_data = dict(row.value or {})
    settings_data["heroBanners"] = _normalize_hero_banners(settings_data.get("heroBanners"))
    settings_data["checkoutServices"] = _normalize_checkout_services(
        settings_data.get("checkoutServices", DEFAULT_STORE_SETTINGS["checkoutServices"])
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
    if not product.in_stock or product.quantity < payload.quantity:
        raise HTTPException(status_code=400, detail="Товара нет в достаточном количестве")

    quantity = payload.quantity
    line_total = int(product.price) * quantity
    product.quantity -= quantity
    if product.quantity <= 0:
        product.quantity = 0
        product.in_stock = False

    images = (product.specs or {}).get("images", [])
    comment = (payload.comment or "").strip()
    order_comment = f"Покупка в 1 клик. Комментарий клиента: {comment}" if comment else "Покупка в 1 клик"

    order = Order(
        status="pending",
        total=line_total,
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
