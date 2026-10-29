"""Чтение настроек магазина из БД."""

from urllib.parse import urlparse
from uuid import uuid4

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


HERO_BANNER_ALT_MAX_LENGTH = 160


def sanitize_hero_href(value: object) -> str:
    """Оставляет только внутренние пути и http(s)-ссылки."""
    href = str(value or "").strip()
    if not href:
        return ""
    if href.startswith("/") and not href.startswith("//"):
        return href
    parsed = urlparse(href)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return href
    return ""


def sanitize_hero_alt(value: object) -> str:
    text = str(value or "").replace("\x00", "").strip()
    if not text:
        return ""
    text = " ".join(text.split())
    return text[:HERO_BANNER_ALT_MAX_LENGTH]


def _hero_enabled(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    text = str(value).strip().lower()
    if text in {"", "1", "true", "yes", "on"}:
        return True
    if text in {"0", "false", "no", "off"}:
        return False
    return True


def build_hero_banner(
    image: str,
    *,
    banner_id: str = "",
    href: str = "",
    alt: str = "",
    enabled: bool = True,
    mobile_image: str = "",
) -> dict[str, str | bool]:
    return {
        "id": banner_id or uuid4().hex,
        "image": image,
        "mobileImage": mobile_image,
        "href": href,
        "alt": alt,
        "enabled": enabled,
    }


def normalize_hero_banners(value: object) -> list[dict[str, str | bool]]:
    items = value if isinstance(value, list) else []
    normalized: list[dict[str, str | bool]] = []
    used_ids: set[str] = set()
    for item in items:
        if isinstance(item, str):
            image = item.strip()
            if not image:
                continue
            banner_id = uuid4().hex
            used_ids.add(banner_id)
            normalized.append(build_hero_banner(image, banner_id=banner_id))
            continue
        if not isinstance(item, dict):
            continue
        image = str(item.get("image", "")).strip()
        if not image:
            continue
        banner_id = str(item.get("id") or "").strip()
        if not banner_id or banner_id in used_ids:
            banner_id = uuid4().hex
        used_ids.add(banner_id)
        mobile_image = str(item.get("mobileImage", "")).strip()
        if mobile_image == image:
            mobile_image = ""
        normalized.append(
            build_hero_banner(
                image,
                banner_id=banner_id,
                href=sanitize_hero_href(item.get("href", "")),
                alt=sanitize_hero_alt(item.get("alt", "")),
                enabled=_hero_enabled(item.get("enabled", True)),
                mobile_image=mobile_image,
            )
        )
    return normalized
