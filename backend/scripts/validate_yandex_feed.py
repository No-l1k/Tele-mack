"""Validate YML feed against basic Yandex Merchants rules."""
from __future__ import annotations

import re
import sys
import urllib.request
from xml.etree import ElementTree as ET

FEED_URL = "https://tele-makc.ru/api/feeds/yandex.yml"
VALID_GTIN_LENGTHS = {8, 12, 13, 14}


def main() -> int:
    raw = urllib.request.urlopen(FEED_URL, timeout=60).read()
    root = ET.fromstring(raw)
    shop = root.find("shop")
    if shop is None:
        print("ERROR: missing shop")
        return 1

    offers = shop.find("offers").findall("offer")
    categories = shop.find("categories").findall("category")
    cat_ids = {c.get("id") for c in categories if c.get("id")}

    issues: list[str] = []
    warnings: list[str] = []

    if root.tag != "yml_catalog" or not root.get("date"):
        issues.append("yml_catalog: missing date attribute")
    if not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$", root.get("date") or ""):
        warnings.append(f"yml_catalog date format unusual: {root.get('date')}")

    for cat in categories:
        cid = cat.get("id")
        pid = cat.get("parentId")
        if pid and pid not in cat_ids:
            issues.append(f"category {cid}: parentId {pid} not in feed")

    for offer in offers:
        oid = offer.get("id") or "?"
        name = (offer.findtext("name") or "").strip()
        url = offer.findtext("url") or ""
        price = offer.findtext("price")
        currency = offer.findtext("currencyId")
        cat_id = offer.findtext("categoryId")
        pics = offer.findall("picture")
        desc_el = offer.find("description")
        desc_text = (desc_el.text or "").strip() if desc_el is not None else ""
        barcode = (offer.findtext("barcode") or "").strip()

        if not name:
            issues.append(f"offer {oid}: empty name")
        if not url.startswith("https://"):
            issues.append(f"offer {oid}: url must be absolute https")
        if not price or int(price) <= 0:
            issues.append(f"offer {oid}: invalid price")
        if currency != "RUR":
            issues.append(f"offer {oid}: currencyId must be RUR, got {currency}")
        if cat_id not in cat_ids:
            issues.append(f"offer {oid}: categoryId {cat_id} not in categories")
        if not pics:
            issues.append(f"offer {oid}: no picture")
        for pic in pics:
            if not (pic.text or "").startswith("http"):
                issues.append(f"offer {oid}: picture not absolute URL")
        if not desc_text:
            warnings.append(f"offer {oid}: empty description")
        old = offer.findtext("oldprice")
        if old and int(old) <= int(price):
            issues.append(f"offer {oid}: oldprice must be greater than price")

        if barcode:
            if not barcode.isdigit() or len(barcode) not in VALID_GTIN_LENGTHS:
                warnings.append(f"offer {oid}: invalid GTIN/EAN barcode '{barcode}'")

    print(f"Feed: {FEED_URL}")
    print(f"Offers: {len(offers)}, categories: {len(categories)}")
    print(f"Issues: {len(issues)}")
    for item in issues[:30]:
        print(f"  [ERROR] {item}")
    print(f"Warnings: {len(warnings)}")
    for item in warnings[:30]:
        print(f"  [WARN] {item}")
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
