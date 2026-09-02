"""Чтение настроек магазина из БД."""

from sqlalchemy.orm import Session

from ..models import Setting
from ..pricing_constants import REGION_COST_PER_KM_DEFAULT

DEFAULT_MIN_ORDER_SUBTOTAL_RUB = 4000
LEGACY_MIN_ORDER_SUBTOTAL_RUB = 1
LEGACY_REGION_COST_PER_KM = 50


def resolve_min_order_subtotal_rub(raw: object) -> int:
    """Минимальная сумма товаров в заказе из deliveryInfo.moscowMinSum."""
    if raw is None or raw == "":
        return DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    if value <= 0 or value == LEGACY_MIN_ORDER_SUBTOTAL_RUB:
        return DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    return value


def resolve_region_cost_per_km(raw: object) -> int:
    """Стоимость км за МКАД; устаревшее 50 → актуальный дефолт 70."""
    if raw is None or raw == "":
        return REGION_COST_PER_KM_DEFAULT
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return REGION_COST_PER_KM_DEFAULT
    if value < 0:
        return REGION_COST_PER_KM_DEFAULT
    if value == LEGACY_REGION_COST_PER_KM:
        return REGION_COST_PER_KM_DEFAULT
    return value


def normalize_delivery_info(delivery_info: object) -> dict:
    """Нормализует deliveryInfo; исправляет устаревшие moscowMinSum и regionCostPerKm."""
    data = dict(delivery_info) if isinstance(delivery_info, dict) else {}
    data["moscowMinSum"] = resolve_min_order_subtotal_rub(data.get("moscowMinSum"))
    data["regionCostPerKm"] = resolve_region_cost_per_km(data.get("regionCostPerKm"))
    return data


def min_order_subtotal_rub(db: Session) -> int:
    row = db.query(Setting).filter(Setting.key == "store").first()
    if not row or not isinstance(row.value, dict):
        return DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    di = row.value.get("deliveryInfo") or {}
    return resolve_min_order_subtotal_rub(di.get("moscowMinSum"))
