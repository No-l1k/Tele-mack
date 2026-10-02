"""Шаблоны характеристик для популярных категорий (синхронно с lib/product-spec-templates.ts)."""

from __future__ import annotations

from typing import TypedDict
from uuid import uuid4

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from .models import Category, Setting


class SpecDefinition(TypedDict, total=False):
    name: str
    values: list[str]


class SpecTemplate(TypedDict, total=False):
    id: str
    title: str
    match: list[str]
    categoryIds: list[int]
    specs: list[SpecDefinition]


YES_NO_VALUES = ["есть", "нет"]
SPEC_TEMPLATES_SETTING_KEY = "spec_templates"

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


def default_spec_templates() -> list[dict]:
    payload: list[dict] = []
    for index, template in enumerate(SPEC_TEMPLATES):
        payload.append(
            {
                "id": f"default-{index + 1}",
                "title": template["title"],
                "match": list(template.get("match") or []),
                "categoryIds": [],
                "specs": [
                    {
                        "name": spec["name"],
                        "values": list(spec.get("values") or []),
                    }
                    for spec in template["specs"]
                ],
            }
        )
    return payload


def normalize_spec_templates(raw: object) -> list[dict]:
    items = raw if isinstance(raw, list) else []
    normalized: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        specs_raw = item.get("specs") if isinstance(item.get("specs"), list) else []
        specs: list[dict] = []
        for spec in specs_raw:
            if not isinstance(spec, dict):
                continue
            name = " ".join(str(spec.get("name") or "").split())
            if not name:
                continue
            values_raw = spec.get("values") if isinstance(spec.get("values"), list) else []
            values = []
            seen: set[str] = set()
            for value in values_raw:
                text = str(value).strip()
                if not text or text in seen:
                    continue
                seen.add(text)
                values.append(text)
            specs.append({"name": name, "values": values})
        if not title and not specs:
            continue
        match_raw = item.get("match") if isinstance(item.get("match"), list) else []
        match = []
        for keyword in match_raw:
            text = str(keyword).strip().casefold()
            if text and text not in match:
                match.append(text)
        category_ids: list[int] = []
        for raw_id in item.get("categoryIds") or []:
            try:
                category_id = int(raw_id)
            except (TypeError, ValueError):
                continue
            if category_id > 0 and category_id not in category_ids:
                category_ids.append(category_id)
        template_id = str(item.get("id") or "").strip() or f"tpl-{uuid4().hex[:10]}"
        normalized.append(
            {
                "id": template_id,
                "title": title or "Шаблон",
                "match": match,
                "categoryIds": category_ids,
                "specs": specs,
            }
        )
    return normalized


def load_spec_templates(db: Session) -> list[dict]:
    row = db.query(Setting).filter(Setting.key == SPEC_TEMPLATES_SETTING_KEY).first()
    if not row or not isinstance(row.value, dict) or "templates" not in row.value:
        return default_spec_templates()
    return normalize_spec_templates(row.value.get("templates"))


def save_spec_templates(db: Session, raw: object) -> list[dict]:
    templates = normalize_spec_templates(raw)
    row = db.query(Setting).filter(Setting.key == SPEC_TEMPLATES_SETTING_KEY).first()
    payload = {"templates": templates}
    if not row:
        row = Setting(key=SPEC_TEMPLATES_SETTING_KEY, value=payload)
        db.add(row)
    else:
        row.value = payload
        flag_modified(row, "value")
    db.commit()
    db.refresh(row)
    return templates


def _ancestor_ids(db: Session, category_id: int | None) -> list[int]:
    if not category_id:
        return []
    ids: list[int] = []
    current_id: int | None = category_id
    seen: set[int] = set()
    while current_id and current_id not in seen:
        seen.add(current_id)
        row = db.query(Category.id, Category.parent_id).filter(Category.id == current_id).first()
        if not row:
            break
        ids.append(int(row[0]))
        current_id = int(row[1]) if row[1] else None
    return ids


def get_spec_template_for_category(
    db: Session | None = None,
    *,
    category_id: int | None = None,
    name: str = "",
    slug: str = "",
) -> SpecTemplate | None:
    templates = load_spec_templates(db) if db is not None else default_spec_templates()
    for current_id in _ancestor_ids(db, category_id) if db is not None else []:
        for template in templates:
            if current_id in (template.get("categoryIds") or []):
                return template  # type: ignore[return-value]
    haystack = _normalize_for_match(f"{name} {slug}")
    if haystack:
        for template in templates:
            if any(keyword in haystack for keyword in (template.get("match") or [])):
                return template  # type: ignore[return-value]
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
