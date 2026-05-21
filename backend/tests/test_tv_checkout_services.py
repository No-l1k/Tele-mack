from app.services.tv_checkout_services import (
    TV_EXTRA_WARRANTY_PRICE,
    build_tv_service_entry,
    installation_price,
    parse_screen_diagonal_inches,
    pixel_check_price,
)
from app.models import Product


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
