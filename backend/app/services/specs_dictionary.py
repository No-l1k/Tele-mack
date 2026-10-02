"""Словарь характеристик: названия и значения из уже сохранённых товаров.

Значения всегда привязаны к названию, поэтому «55» не смешивается с «Чёрный».
"""

from __future__ import annotations

import re
from collections import defaultdict
from typing import Iterable

INTERNAL_SPEC_KEYS = frozenset(
    {
        "images",
        "source",
        "externalOfferId",
        "sourceUrl",
        "currencyId",
    }
)
RESERVED_SPEC_KEYS = INTERNAL_SPEC_KEYS
MAX_SPECS = 300
MAX_VALUES_PER_SPEC = 80
_CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")


def normalize_spec_name(name: object) -> str:
    return " ".join(str(name).split())


def stringify_spec_values(value: object) -> list[str]:
    if value is None or isinstance(value, bool):
        return []
    if isinstance(value, float) and value.is_integer():
        return [str(int(value))]
    if isinstance(value, (int, float)):
        return [str(value)]
    if isinstance(value, list):
        items: list[str] = []
        for item in value:
            items.extend(stringify_spec_values(item))
        return items
    text = str(value).strip()
    return [text] if text else []


def is_dictionary_spec_name(name: str) -> bool:
    """В подсказки попадают только человекочитаемые названия с кириллицей.

    Служебные поля YML (currencyId, sourceUrl) и английские ключи из фида
    (refresh, channels, bandwidth) в список не попадают — для них остаются шаблоны.
    """
    if not name or name in RESERVED_SPEC_KEYS:
        return False
    return bool(_CYRILLIC_RE.search(name))


def public_product_specs(specs: dict | None) -> dict:
    if not isinstance(specs, dict):
        return {}
    return {
        key: value
        for key, value in specs.items()
        if normalize_spec_name(key) not in INTERNAL_SPEC_KEYS
    }


def preserve_internal_specs(existing: dict | None, incoming: dict) -> dict:
    merged = dict(incoming)
    if not isinstance(existing, dict):
        return merged
    for key in INTERNAL_SPEC_KEYS:
        if key == "images":
            continue
        if key in existing and key not in merged:
            merged[key] = existing[key]
    return merged


def _locale_sort_key(value: str) -> tuple[str, str]:
    return (value.casefold(), value)


def build_specs_dictionary(
    rows: Iterable[tuple[object, object, bool]],
) -> list[dict]:
    """Собирает словарь из (specs, in_category) пар.

    `rows` — последовательность `(specs_dict, in_category_flag)`.
    """
    name_usage: dict[str, int] = defaultdict(int)
    name_in_category: dict[str, bool] = defaultdict(bool)
    value_usage: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for specs, in_category in rows:
        if not isinstance(specs, dict):
            continue
        seen_names: set[str] = set()
        for raw_key, raw_value in specs.items():
            name = normalize_spec_name(raw_key)
            if not is_dictionary_spec_name(name) or name in seen_names:
                continue
            seen_names.add(name)
            name_usage[name] += 1
            if in_category:
                name_in_category[name] = True
            for item in stringify_spec_values(raw_value):
                value_usage[name][item] += 1

    payload: list[dict] = []
    for name, usage_count in name_usage.items():
        values = [
            {"value": value, "usageCount": count}
            for value, count in value_usage[name].items()
        ]
        values.sort(key=lambda item: (-int(item["usageCount"]), *_locale_sort_key(str(item["value"]))))
        payload.append(
            {
                "name": name,
                "usageCount": usage_count,
                "inCategory": bool(name_in_category[name]),
                "values": values[:MAX_VALUES_PER_SPEC],
            }
        )

    payload.sort(
        key=lambda item: (
            not bool(item["inCategory"]),
            -int(item["usageCount"]),
            *_locale_sort_key(str(item["name"])),
        )
    )
    return payload[:MAX_SPECS]
