"""Генерация YML-фида для Яндекс Товаров (https://yandex.ru/support/merchants/ru/connect/form-feed)."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from html import escape

from sqlalchemy.orm import Session, joinedload

from ..config import settings
from ..models import Category, Product, ProductCategory
from ..pricing_constants import COURIER_DELIVERY_COST_RUB
from ..services.products import _normalize_product_images

_PICKUP_ADDRESS = "г. Москва, ул. Прасковьина, 21"
_SALES_NOTES = (
    "Доставка по России. Москва и МО: 1000 руб., за МКАД +50 руб/км. "
    "В регионы — по предоплате. Самовывоз: "
    f"{_PICKUP_ADDRESS}."
)
_HTML_BREAK_RE = re.compile(r"<\s*br\s*/?>", re.IGNORECASE)
_HTML_BLOCK_END_RE = re.compile(r"</\s*(?:p|h[1-6]|section|figure|li|div)\s*>", re.IGNORECASE)
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_HTML_ENTITY_RE = [
    (re.compile(r"&nbsp;", re.IGNORECASE), " "),
    (re.compile(r"&amp;", re.IGNORECASE), "&"),
    (re.compile(r"&lt;", re.IGNORECASE), "<"),
    (re.compile(r"&gt;", re.IGNORECASE), ">"),
    (re.compile(r"&quot;", re.IGNORECASE), '"'),
    (re.compile(r"&#39;", re.IGNORECASE), "'"),
]


def _site_origin() -> str:
    return settings.frontend_base_url.rstrip("/")


def _absolute_url(path: str) -> str:
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{_site_origin()}{path if path.startswith('/') else f'/{path}'}"


def _html_to_plain(text: str) -> str:
    if not text:
        return ""
    value = _HTML_BREAK_RE.sub("\n", text)
    value = _HTML_BLOCK_END_RE.sub("\n\n", value)
    value = _HTML_TAG_RE.sub(" ", value)
    for pattern, replacement in _HTML_ENTITY_RE:
        value = pattern.sub(replacement, value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return value.strip()


def _description_cdata(raw: str) -> str:
    """Описание в CDATA с тегами p — допустимо в фиде Яндекса."""
    plain = _html_to_plain(raw)
    if not plain:
        return "<![CDATA[]]>"
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", plain) if p.strip()]
    if not paragraphs:
        paragraphs = [plain]
    parts: list[str] = []
    for paragraph in paragraphs:
        inner = escape(paragraph).replace("\n", "<br/>")
        parts.append(f"<p>{inner}</p>")
    body = "".join(parts).replace("]]>", "]]]]><![CDATA[>")
    return f"<![CDATA[{body}]]>"


def _escape_xml_text(value: str) -> str:
    return escape(value, quote=False)


def _catalog_date_rfc3339() -> str:
    now = datetime.now(timezone.utc).astimezone()
    catalog_date = now.strftime("%Y-%m-%dT%H:%M:%S%z")
    if len(catalog_date) > 5 and catalog_date[-5] in "+-":
        catalog_date = f"{catalog_date[:-2]}:{catalog_date[-2:]}"
    return catalog_date


def _collect_categories_for_products(categories: list[Category], used_ids: set[int]) -> list[Category]:
    by_id = {category.id: category for category in categories}
    result_ids: set[int] = set()

    def add_with_parents(category_id: int) -> None:
        current_id: int | None = category_id
        while current_id is not None and current_id not in result_ids:
            category = by_id.get(current_id)
            if not category:
                break
            result_ids.add(current_id)
            current_id = category.parent_id

    for category_id in used_ids:
        add_with_parents(category_id)

    return [by_id[cid] for cid in sorted(result_ids, key=lambda cid: (by_id[cid].sort_order, cid))]


def _eligible_products(db: Session) -> list[Product]:
    rows = (
        db.query(Product)
        .options(joinedload(Product.category))
        .order_by(Product.id.asc())
        .all()
    )
    eligible: list[Product] = []
    for product in rows:
        if not product.price or int(product.price) <= 0:
            continue
        if not _normalize_product_images(product.specs or {}):
            continue
        eligible.append(product)
    return eligible


def build_yandex_feed_xml(db: Session) -> bytes:
    origin = _site_origin()
    catalog_date = _catalog_date_rfc3339()
    products = _eligible_products(db)
    all_categories = db.query(Category).order_by(Category.sort_order.asc(), Category.id.asc()).all()
    used_category_ids = {product.category_id for product in products if product.category_id}
    used_category_ids.update(
        row[0] for row in db.query(ProductCategory.category_id).distinct().all() if row[0]
    )
    feed_categories = _collect_categories_for_products(all_categories, used_category_ids)

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<yml_catalog date="{catalog_date}">',
        "  <shop>",
        "    <name>TeleMakc</name>",
        "    <company>TeleMakc</company>",
        f"    <url>{escape(origin, quote=True)}</url>",
        "    <categories>",
    ]
    for category in feed_categories:
        parent_attr = f' parentId="{category.parent_id}"' if category.parent_id else ""
        lines.append(
            f'      <category id="{category.id}"{parent_attr}>{_escape_xml_text(category.name)}</category>'
        )
    lines.extend(
        [
            "    </categories>",
            "    <delivery-options>",
            f'      <option cost="{COURIER_DELIVERY_COST_RUB}" days="1-3"/>',
            "    </delivery-options>",
            "    <pickup-options>",
            '      <option cost="0" days="0"/>',
            "    </pickup-options>",
            "    <offers>",
        ]
    )

    for product in products:
        category = product.category
        if not category:
            continue
        images = _normalize_product_images(product.specs or {})
        available = "true" if product.in_stock else "false"
        lines.append(f'      <offer id="{product.id}" available="{available}">')
        lines.append(f"        <name>{_escape_xml_text(product.name)}</name>")
        if product.brand:
            lines.append(f"        <vendor>{_escape_xml_text(product.brand)}</vendor>")
        if product.sku:
            lines.append(f"        <vendorCode>{_escape_xml_text(product.sku)}</vendorCode>")
        lines.append(f"        <url>{escape(f'{origin}/product/{product.slug}', quote=True)}</url>")
        lines.append(f"        <price>{int(product.price)}</price>")
        if product.old_price and int(product.old_price) > int(product.price):
            lines.append(f"        <oldprice>{int(product.old_price)}</oldprice>")
        lines.append("        <currencyId>RUR</currencyId>")
        lines.append(f"        <categoryId>{category.id}</categoryId>")
        for image_path in images[:10]:
            lines.append(f"        <picture>{escape(_absolute_url(image_path), quote=True)}</picture>")
        desc = product.description or product.short_description or ""
        lines.append(f"        <description>{_description_cdata(desc)}</description>")
        lines.append(f"        <sales_notes>{_escape_xml_text(_SALES_NOTES)}</sales_notes>")
        if product.gtin:
            lines.append(f"        <barcode>{_escape_xml_text(product.gtin)}</barcode>")
        lines.append("      </offer>")

    lines.extend(["    </offers>", "  </shop>", "</yml_catalog>"])
    return "\n".join(lines).encode("utf-8")
