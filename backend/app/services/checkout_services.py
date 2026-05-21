from __future__ import annotations

"""Настройки доп. услуг checkout: хранение в settings.checkoutServices.

Услуги для телевизоров (проверка пикселей, установка, гарантия на 1 год) создаются
динамически в tv_checkout_services и не настраиваются здесь.
"""

LEGACY_TV_CHECKOUT_SERVICE_IDS = frozenset({"pixel-check", "installation"})

DEFAULT_CHECKOUT_SERVICES: list[dict[str, object]] = [
    {
        "id": "bracket-selection",
        "name": "Подбор кронштейна для ТВ",
        "price": 0,
        "description": "подробнее",
        "enabled": True,
        "sortOrder": 1,
    },
    {
        "id": "extended-warranty-2y",
        "name": "Расширенная гарантия на 2 года",
        "price": 1843,
        "description": (
            "Все заботы по ремонту мы возьмем на себя в течение 2 лет. "
            "Если товар не подлежит ремонту, обменяем его на новый той же модели."
        ),
        "enabled": True,
        "sortOrder": 2,
    },
    {
        "id": "extended-warranty-3y",
        "name": "Расширенная гарантия на 3 года",
        "price": 2765,
        "description": (
            "Все заботы по ремонту мы возьмем на себя в течение 3 лет. "
            "Если товар не подлежит ремонту, обменяем его на новый той же модели."
        ),
        "enabled": True,
        "sortOrder": 3,
    },
]


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
        if service_id in LEGACY_TV_CHECKOUT_SERVICE_IDS:
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


def normalize_checkout_services(value: object | None) -> list[dict[str, object]]:
    """Сохраняет список из БД как есть; дефолты только если значение ещё не задано."""
    if value is None:
        return sorted(_normalize_list(DEFAULT_CHECKOUT_SERVICES), key=lambda service: int(service["sortOrder"]))
    return sorted(_normalize_list(value), key=lambda service: int(service["sortOrder"]))


def checkout_services_map_from_settings(settings_data: dict | None) -> dict[str, dict[str, object]]:
    services = normalize_checkout_services(
        (settings_data or {}).get("checkoutServices") if isinstance(settings_data, dict) else None
    )
    result: dict[str, dict[str, object]] = {}
    for service in services:
        if not service.get("enabled", True):
            continue
        service_id = str(service["id"])
        result[service_id] = {
            "id": service_id,
            "name": str(service["name"]),
            "price": max(int(service.get("price", 0) or 0), 0),
        }
    return result
