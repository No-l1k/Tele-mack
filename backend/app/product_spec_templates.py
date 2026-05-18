"""Шаблоны характеристик для популярных категорий (синхронно с lib/product-spec-templates.ts)."""

from __future__ import annotations

from typing import TypedDict


class SpecDefinition(TypedDict, total=False):
    name: str
    values: list[str]


class SpecTemplate(TypedDict):
    title: str
    match: list[str]
    specs: list[SpecDefinition]


YES_NO_VALUES = ["есть", "нет"]

SPEC_TEMPLATES: list[SpecTemplate] = [
    {
        "title": "Телевизоры",
        "match": ["телевиз", "tv", "tvs", "televizor"],
        "specs": [
            {"name": "Диагональ экрана (дюйм)"},
            {"name": "Поддержка Smart TV", "values": YES_NO_VALUES},
            {"name": "Разрешение экрана", "values": ["4K Ultra HD", "8K Ultra HD", "Full HD", "HD-Ready"]},
            {"name": "Частота обновления экрана", "values": ["100 Гц", "120 Гц", "144 Гц", "165 Гц", "60 Гц"]},
            {
                "name": "Операционная система",
                "values": ["Android", "Google TV", "HomeOS", "Tizen", "VIDAA", "YaOS", "webOS", "Салют ТВ"],
            },
        ],
    },
    {
        "title": "Кронштейны",
        "match": ["кронштейн", "bracket", "mount", "holder"],
        "specs": [
            {"name": "Назначение кронштейна", "values": ["для AV-оборудования", "для мониторов", "для телевизоров"]},
            {"name": "Место крепления кронштейна", "values": ["потолок", "стена", "стол"]},
            {
                "name": "Тип кронштейна",
                "values": [
                    "наклонно-поворотный",
                    "наклонный",
                    "поворотный",
                    "полка",
                    "потолочный",
                    "стойка",
                    "фиксированный",
                ],
            },
        ],
    },
    {
        "title": "Саундбары",
        "match": ["саундбар", "soundbar"],
        "specs": [
            {"name": "Суммарная мощность", "values": ["до 100 Вт", "от 101 до 200 Вт", "от 201 до 390 Вт", "от 400 Вт"]},
            {"name": "Bluetooth", "values": YES_NO_VALUES},
            {"name": "Wi-Fi", "values": YES_NO_VALUES},
            {"name": "USB-порт", "values": YES_NO_VALUES},
            {"name": "HDMI", "values": YES_NO_VALUES},
            {"name": "NFC", "values": YES_NO_VALUES},
            {"name": "Беспроводной сабвуфер", "values": YES_NO_VALUES},
        ],
    },
]


def _normalize_for_match(value: str) -> str:
    return value.strip().replace("ё", "е").casefold()


def get_spec_template_for_category(*, name: str = "", slug: str = "") -> SpecTemplate | None:
    haystack = _normalize_for_match(f"{name} {slug}")
    for template in SPEC_TEMPLATES:
        if any(keyword in haystack for keyword in template["match"]):
            return template
    return None


def order_facet_values(definition: SpecDefinition, available: set[str]) -> list[str]:
    predefined = definition.get("values") or []
    if predefined:
        ordered = [value for value in predefined if value in available]
        extras = sorted(value for value in available if value not in predefined)
        return [*ordered, *extras]
    return sorted(available, key=lambda item: (len(item), item.casefold()))


def build_spec_facets(products, template: SpecTemplate) -> dict[str, list[str]]:
    facets: dict[str, list[str]] = {}
    for spec_def in template["specs"]:
        key = spec_def["name"]
        available: set[str] = set()
        for product in products:
            specs = product.specs if isinstance(product.specs, dict) else {}
            raw = specs.get(key)
            if raw is None:
                continue
            value = str(raw).strip()
            if value:
                available.add(value)
        if available:
            facets[key] = order_facet_values(spec_def, available)
    return facets
