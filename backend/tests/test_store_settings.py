from app.services.store_settings import (
    DEFAULT_MIN_ORDER_SUBTOTAL_RUB,
    resolve_min_order_subtotal_rub,
    normalize_delivery_info,
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
