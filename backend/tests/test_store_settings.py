from app.services.store_settings import (
    DEFAULT_MIN_ORDER_SUBTOTAL_RUB,
    resolve_min_order_subtotal_rub,
    normalize_delivery_info,
    normalize_hero_banners,
    sanitize_hero_alt,
    sanitize_hero_href,
)
from app.pricing_constants import REGION_COST_PER_KM_DEFAULT


def test_resolve_min_order_legacy_one_rub():
    assert resolve_min_order_subtotal_rub(1) == DEFAULT_MIN_ORDER_SUBTOTAL_RUB


def test_resolve_min_order_valid():
    assert resolve_min_order_subtotal_rub(4000) == 4000
    assert resolve_min_order_subtotal_rub(5000) == 5000


def test_resolve_min_order_invalid():
    assert resolve_min_order_subtotal_rub(0) == DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    assert resolve_min_order_subtotal_rub(None) == DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    assert resolve_min_order_subtotal_rub("bad") == DEFAULT_MIN_ORDER_SUBTOTAL_RUB


def test_normalize_delivery_info_fixes_legacy():
    result = normalize_delivery_info({"moscowMinSum": 1, "moscowFree": True, "regionCostPerKm": 50})
    assert result["moscowMinSum"] == DEFAULT_MIN_ORDER_SUBTOTAL_RUB
    assert result["moscowFree"] is True
    assert result["regionCostPerKm"] == REGION_COST_PER_KM_DEFAULT


def test_normalize_delivery_info_keeps_custom_region_cost():
    result = normalize_delivery_info({"regionCostPerKm": 80})
    assert result["regionCostPerKm"] == 80


def test_sanitize_hero_href_allows_internal_and_http():
    assert sanitize_hero_href("/catalog/televizory") == "/catalog/televizory"
    assert sanitize_hero_href("https://example.com/sale") == "https://example.com/sale"
    assert sanitize_hero_href("http://example.com") == "http://example.com"
    assert sanitize_hero_href("  /catalog/saundbary  ") == "/catalog/saundbary"


def test_sanitize_hero_href_strips_unsafe():
    assert sanitize_hero_href("javascript:alert(1)") == ""
    assert sanitize_hero_href("//evil.example/phish") == ""
    assert sanitize_hero_href("catalog/televizory") == ""
    assert sanitize_hero_href("data:text/html,hi") == ""
    assert sanitize_hero_href("") == ""
    assert sanitize_hero_href(None) == ""


def test_normalize_hero_banners_mixed_and_invalid():
    result = normalize_hero_banners(
        [
            "/uploads/hero/a.jpg",
            {"image": "  /uploads/hero/b.webp  ", "href": "javascript:alert(1)"},
            {"image": "", "href": "/catalog/tv"},
            {"image": "/uploads/hero/c.png", "href": "/catalog/televizory"},
            None,
        ]
    )
    assert [item["image"] for item in result] == [
        "/uploads/hero/a.jpg",
        "/uploads/hero/b.webp",
        "/uploads/hero/c.png",
    ]
    assert [item["href"] for item in result] == ["", "", "/catalog/televizory"]
    assert all(item["id"] for item in result)
    assert all(item["enabled"] is True for item in result)
    assert all(item["mobileImage"] == "" for item in result)
    assert all(item["alt"] == "" for item in result)


def test_normalize_hero_banners_empty():
    assert normalize_hero_banners(None) == []
    assert normalize_hero_banners("not-a-list") == []


def test_sanitize_hero_alt_trims_and_limits():
    assert sanitize_hero_alt("  Акция на ТВ  ") == "Акция на ТВ"
    assert sanitize_hero_alt("a" * 200) == "a" * 160
    assert sanitize_hero_alt(None) == ""


def test_normalize_hero_banners_keeps_fields():
    result = normalize_hero_banners(
        [
            {
                "id": "keep-me",
                "image": "/uploads/hero/a.jpg",
                "mobileImage": "/uploads/hero/a-m.jpg",
                "href": "/catalog/televizory",
                "alt": "Телевизоры",
                "enabled": False,
            }
        ]
    )
    assert result == [
        {
            "id": "keep-me",
            "image": "/uploads/hero/a.jpg",
            "mobileImage": "/uploads/hero/a-m.jpg",
            "href": "/catalog/televizory",
            "alt": "Телевизоры",
            "enabled": False,
        }
    ]


def test_normalize_hero_banners_drops_duplicate_mobile():
    result = normalize_hero_banners(
        [{"id": "one", "image": "/uploads/hero/a.jpg", "mobileImage": "/uploads/hero/a.jpg"}]
    )
    assert result[0]["mobileImage"] == ""
