"""Чтение настроек магазина из БД."""

from sqlalchemy.orm import Session

from ..models import Setting

DEFAULT_MIN_ORDER_SUBTOTAL_RUB = 4000


def min_order_subtotal_rub(db: Session) -> int:
    """Минимальная сумма товаров в заказе (из store.deliveryInfo.moscowMinSum)."""
    row = db.query(Setting).filter(Setting.key == "store").first()
    if not row or not isinstance(row.value, dict):
        return DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    di = row.value.get("deliveryInfo") or {}
    raw = di.get("moscowMinSum")
    try:
        v = int(raw)
    except (TypeError, ValueError):
        return DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    if v <= 0:
        return DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    # Раньше в дефолтах было 1 ₽ — считаем это устаревшим значением
    if v == 1:
        return DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    return v
