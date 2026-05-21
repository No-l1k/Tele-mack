from __future__ import annotations

import re

from ..models import Product

TV_SCREEN_DIAGONAL_SPEC = "Диагональ экрана (дюйм)"
TV_CATEGORY_KEYWORDS = ("телевиз", "televizor", "tv")
from .checkout_services import LEGACY_TV_CHECKOUT_SERVICE_IDS
TV_EXTRA_WARRANTY_PRICE = 8000
_DIAGONAL_RE = re.compile(r"(\d+(?:[.,]\d+)?)")


def is_tv_product(product: Product) -> bool:
    specs = product.specs if isinstance(product.specs, dict) else {}
    if TV_SCREEN_DIAGONAL_SPEC in specs:
        return True
    category = product.category
    slug = (category.slug if category else "").lower()
    return any(keyword in slug for keyword in TV_CATEGORY_KEYWORDS)


def parse_screen_diagonal_inches(specs: dict | None) -> int | None:
    if not isinstance(specs, dict):
        return None
    raw = specs.get(TV_SCREEN_DIAGONAL_SPEC)
    if raw is None or raw == "":
        return None
    match = _DIAGONAL_RE.search(str(raw))
    if not match:
        return None
    return round(float(match.group(1).replace(",", ".")))


def pixel_check_price(diagonal: int | None) -> int:
    if diagonal is None:
        return 1500
    if diagonal > 97:
        return 5500
    if diagonal >= 83:
        return 4500
    if diagonal >= 65:
        return 3500
    if diagonal >= 50:
        return 2000
    return 1500


def installation_price(diagonal: int | None) -> int:
    if diagonal is None:
        return 5500
    if diagonal >= 110:
        return 35000
    if diagonal >= 90:
        return 20000
    if diagonal >= 75:
        return 12000
    if diagonal >= 55:
        return 7500
    return 5500


def _format_price_rub(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " ₽"


def _parse_tv_service_id(service_id: str) -> tuple[str, int, int] | None:
    if service_id.startswith("tv-pixel:"):
        kind = "pixel"
        rest = service_id[len("tv-pixel:") :]
    elif service_id.startswith("tv-install:"):
        kind = "install"
        rest = service_id[len("tv-install:") :]
    elif service_id.startswith("tv-warranty:"):
        kind = "warranty"
        rest = service_id[len("tv-warranty:") :]
    else:
        return None
    try:
        product_id_str, unit_index_str = rest.rsplit(":", 1)
        return kind, int(product_id_str), int(unit_index_str)
    except ValueError:
        return None


def build_tv_service_entry(
    product: Product,
    kind: str,
    unit_index: int,
    quantity: int,
) -> dict[str, object] | None:
    if not is_tv_product(product):
        return None
    if unit_index < 0 or unit_index >= quantity:
        return None

    specs = product.specs if isinstance(product.specs, dict) else {}
    diagonal = parse_screen_diagonal_inches(specs)
    unit_suffix = f" ({unit_index + 1}-й)" if quantity > 1 else ""

    if kind == "pixel":
        price = pixel_check_price(diagonal)
        service_id = f"tv-pixel:{product.id}:{unit_index}"
        name = (
            f'Проверка «{product.name}» на битые пиксели — {_format_price_rub(price)}{unit_suffix}'
        )
    elif kind == "install":
        price = installation_price(diagonal)
        service_id = f"tv-install:{product.id}:{unit_index}"
        name = f'Установка «{product.name}» — {_format_price_rub(price)}{unit_suffix}'
    elif kind == "warranty":
        price = TV_EXTRA_WARRANTY_PRICE
        service_id = f"tv-warranty:{product.id}:{unit_index}"
        name = (
            f'Дополнительная гарантия на 1 год для «{product.name}» — {_format_price_rub(price)}{unit_suffix}'
        )
    else:
        return None

    return {"id": service_id, "name": name, "price": price}


def resolve_tv_checkout_service(
    service_id: str,
    products_by_id: dict[int, Product],
    quantities_by_product: dict[int, int],
) -> dict[str, object] | None:
    parsed = _parse_tv_service_id(service_id)
    if not parsed:
        return None
    kind, product_id, unit_index = parsed
    product = products_by_id.get(product_id)
    if not product:
        return None
    quantity = quantities_by_product.get(product_id, 0)
    if quantity <= 0:
        return None
    return build_tv_service_entry(product, kind, unit_index, quantity)
