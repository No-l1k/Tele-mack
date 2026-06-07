from ..models import Product

PURCHASABLE_STOCK_STATUSES = frozenset({"in_stock", "low_stock"})


def product_in_stock_from_status(stock_status: str | None) -> bool:
    return (stock_status or "").strip() in PURCHASABLE_STOCK_STATUSES


def product_available_for_order(product: Product) -> bool:
    """Доступен ли товар для заказа — по stock_status (источник правды для админки)."""
    return product_in_stock_from_status(product.stock_status)


def _normalize_product_images(specs: dict) -> list[str]:
    """Локальные /uploads — первыми; при наличии загрузок убираем типичные CDN-заглушки (unsplash)."""
    raw = specs.get("images") or []
    if not isinstance(raw, list):
        return []
    urls = [u for u in raw if isinstance(u, str)]
    local = [u for u in urls if u.startswith("/uploads")]
    remote = [u for u in urls if not u.startswith("/uploads")]
    if local:
        remote = [u for u in remote if "images.unsplash.com" not in u]
    return local + remote


def product_to_dict(product: Product) -> dict:
    category = product.category
    specs = product.specs or {}
    clean_specs = {key: value for key, value in specs.items() if key != "images"}
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "shortDescription": product.short_description,
        "price": product.price,
        "oldPrice": product.old_price,
        "images": _normalize_product_images(specs),
        "categoryId": product.category_id,
        "categorySlug": category.slug if category else "",
        "brand": product.brand,
        "sku": product.sku,
        "gtin": product.gtin,
        "specs": clean_specs,
        "inStock": product_in_stock_from_status(product.stock_status),
        "stockStatus": product.stock_status,
        "ratingMode": product.rating_mode,
        "rating": product.rating,
        "reviewsCount": product.reviews_count,
        "warrantyMonths": product.warranty_months,
        "warrantyType": product.warranty_type,
        "serviceInfo": product.service_info,
        "recommendedAccessoryIds": [int(item) for item in (product.recommended_accessory_ids or []) if isinstance(item, int)],
        "variantGroup": product.variant_group,
        "variantName": product.variant_name,
        "variantValue": product.variant_value,
        "metaTitle": product.meta_title,
        "metaDescription": product.meta_description,
        "isNew": product.is_new,
        "createdAt": product.created_at,
    }
