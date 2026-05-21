from app.services.checkout_services import (
    LEGACY_TV_CHECKOUT_SERVICE_IDS,
    normalize_checkout_services,
)


def test_normalize_does_not_restore_deleted_services():
    saved = [
        {
            "id": "bracket-selection",
            "name": "Подбор кронштейна",
            "price": 0,
            "enabled": True,
            "sortOrder": 1,
        }
    ]
    result = normalize_checkout_services(saved)
    ids = {item["id"] for item in result}
    assert ids == {"bracket-selection"}
    assert LEGACY_TV_CHECKOUT_SERVICE_IDS.isdisjoint(ids)


def test_normalize_strips_legacy_tv_services_from_saved_list():
    saved = [
        {
            "id": "pixel-check",
            "name": "Проверка на битые пиксели",
            "price": 1500,
            "enabled": True,
            "sortOrder": 1,
        },
        {
            "id": "custom-service",
            "name": "Своя услуга",
            "price": 500,
            "enabled": True,
            "sortOrder": 2,
        },
    ]
    result = normalize_checkout_services(saved)
    assert [item["id"] for item in result] == ["custom-service"]
