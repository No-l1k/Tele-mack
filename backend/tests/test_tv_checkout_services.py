from app.services.tv_checkout_services import (
    TV_EXTRA_WARRANTY_PRICE,
    build_tv_service_entry,
    courier_delivery_price_by_diagonal,
    installation_price,
    parse_screen_diagonal_inches,
    pixel_check_price,
    resolve_courier_delivery_cost,
)
from app.models import Product


def test_courier_delivery_price_tiers():
    assert courier_delivery_price_by_diagonal(None) == 1000
    assert courier_delivery_price_by_diagonal(32) == 1000
    assert courier_delivery_price_by_diagonal(40) == 1000
    assert courier_delivery_price_by_diagonal(50) == 1500
    assert courier_delivery_price_by_diagonal(65) == 1500
    assert courier_delivery_price_by_diagonal(70) == 2000
    assert courier_delivery_price_by_diagonal(75) == 2000
    assert courier_delivery_price_by_diagonal(83) == 3000
    assert courier_delivery_price_by_diagonal(89) == 3000
    assert courier_delivery_price_by_diagonal(90) == 5500
    assert courier_delivery_price_by_diagonal(100) == 5500


def _tv_product(product_id: int, diagonal: str, *, name: str = "TV") -> Product:
    return Product(
        id=product_id,
        name=name,
        slug=f"tv-{product_id}",
        description="",
        price=50000,
        specs={"Диагональ экрана (дюйм)": diagonal},
        category_id=1,
    )


def test_resolve_courier_delivery_cost_without_tv():
    regular = Product(
        id=10,
        name="Кабель",
        slug="cable",
        description="",
        price=500,
        specs={},
        category_id=2,
    )
    assert resolve_courier_delivery_cost({10: regular}, {10: 2}) == 1000


def test_resolve_courier_delivery_cost_multiple_tvs():
    tv55 = _tv_product(1, "55")
    tv32 = _tv_product(2, "32")
    cost = resolve_courier_delivery_cost({1: tv55, 2: tv32}, {1: 1, 2: 1})
    assert cost == 1500 + 700


def test_resolve_courier_delivery_cost_two_units_same_tv():
    tv55 = _tv_product(1, "55")
    cost = resolve_courier_delivery_cost({1: tv55}, {1: 2})
    assert cost == 1500 + 700


def test_resolve_courier_delivery_cost_three_same_tier_picks_max_tariff():
    """55 и 65 в одном тарифе 1500 — итог всё равно 1500 + 700*2."""
    tv55a = _tv_product(1, "55", name="LG 55")
    tv55b = _tv_product(2, "55", name="Samsung 55")
    tv65 = _tv_product(3, "65", name="Sony 65")
    cost = resolve_courier_delivery_cost(
        {1: tv55a, 2: tv55b, 3: tv65},
        {1: 1, 2: 1, 3: 1},
    )
    assert cost == 1500 + 700 + 700


def test_resolve_courier_delivery_cost_mixed_tiers():
    tv40 = _tv_product(1, "40")
    tv75 = _tv_product(2, "75")
    tv90 = _tv_product(3, "90")
    cost = resolve_courier_delivery_cost(
        {1: tv40, 2: tv75, 3: tv90},
        {1: 1, 2: 1, 3: 1},
    )
    assert cost == 5500 + 700 + 700


def test_pixel_check_price_tiers():
    assert pixel_check_price(None) == 1500
    assert pixel_check_price(40) == 1500
    assert pixel_check_price(48) == 1500
    assert pixel_check_price(50) == 2000
    assert pixel_check_price(60) == 2000
    assert pixel_check_price(65) == 3500
    assert pixel_check_price(80) == 3500
    assert pixel_check_price(83) == 4500
    assert pixel_check_price(97) == 4500
    assert pixel_check_price(98) == 5500
    assert pixel_check_price(99) == 5500


def test_installation_price_tiers():
    assert installation_price(None) == 5500
    assert installation_price(40) == 5500
    assert installation_price(50) == 5500
    assert installation_price(55) == 7500
    assert installation_price(70) == 7500
    assert installation_price(75) == 12000
    assert installation_price(88) == 12000
    assert installation_price(90) == 20000
    assert installation_price(100) == 20000
    assert installation_price(110) == 35000


def test_tv_extra_warranty_service_entry():
    product = Product(
        id=1,
        name="Samsung QE55",
        slug="samsung-qe55",
        description="",
        price=50000,
        specs={"Диагональ экрана (дюйм)": "55"},
        category_id=1,
    )
    entry = build_tv_service_entry(product, "warranty", 0, 1)
    assert entry is not None
    assert entry["price"] == TV_EXTRA_WARRANTY_PRICE
    assert "Дополнительная гарантия на 1 год" in str(entry["name"])
    assert "Samsung QE55" in str(entry["name"])


def test_parse_screen_diagonal_inches():
    assert parse_screen_diagonal_inches({}) is None
    assert parse_screen_diagonal_inches({"Диагональ экрана (дюйм)": ""}) is None
    assert parse_screen_diagonal_inches({"Диагональ экрана (дюйм)": '55"'}) == 55
    assert parse_screen_diagonal_inches({"Диагональ экрана (дюйм)": "65 дюймов"}) == 65
