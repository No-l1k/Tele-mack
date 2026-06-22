from fastapi import HTTPException
from sqlalchemy import func, select, union_all
from sqlalchemy.orm import Session, joinedload

from ..models import Category, Product, ProductCategory


def category_direct_product_counts(db: Session) -> dict[int, int]:
    """Считает товары по категориям: основная + дополнительные привязки."""
    primary_memberships = select(
        Product.category_id.label("category_id"),
        Product.id.label("product_id"),
    ).where(Product.category_id.isnot(None))
    extra_memberships = select(
        ProductCategory.category_id.label("category_id"),
        ProductCategory.product_id.label("product_id"),
    )
    memberships = union_all(primary_memberships, extra_memberships).subquery()
    return {
        int(category_id): int(count)
        for category_id, count in db.query(
            memberships.c.category_id,
            func.count(func.distinct(memberships.c.product_id)),
        )
        .group_by(memberships.c.category_id)
        .all()
        if category_id is not None
    }


def product_load_options():
    return (
        joinedload(Product.category),
        joinedload(Product.category_memberships).joinedload(ProductCategory.category),
    )


def collect_membership_category_ids(product: Product) -> list[int]:
    membership_ids = [membership.category_id for membership in (product.category_memberships or [])]
    if product.category_id and product.category_id not in membership_ids:
        membership_ids.append(product.category_id)
    return sorted(set(membership_ids))


def build_product_categories_payload(product: Product) -> list[dict]:
    categories_by_id: dict[int, Category] = {}
    if product.category:
        categories_by_id[product.category.id] = product.category
    for membership in product.category_memberships or []:
        if membership.category:
            categories_by_id[membership.category.id] = membership.category

    payload: list[dict] = []
    for category_id in collect_membership_category_ids(product):
        category = categories_by_id.get(category_id)
        if not category:
            continue
        payload.append(
            {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "isPrimary": category_id == product.category_id,
            }
        )
    return payload


def _normalize_category_ids(raw_ids: list[int] | None, *, primary_category_id: int | None) -> list[int]:
    normalized: list[int] = []
    seen: set[int] = set()
    for raw in raw_ids or []:
        try:
            value = int(raw)
        except (TypeError, ValueError):
            continue
        if value <= 0 or value in seen:
            continue
        seen.add(value)
        normalized.append(value)
    if primary_category_id and primary_category_id not in seen:
        normalized.insert(0, primary_category_id)
    return normalized


def sync_product_category_memberships(
    db: Session,
    product: Product,
    *,
    category_ids: list[int] | None = None,
    primary_category_id: int | None = None,
) -> None:
    primary = primary_category_id if primary_category_id is not None else product.category_id
    normalized_ids = _normalize_category_ids(category_ids, primary_category_id=primary)
    if not normalized_ids and primary:
        normalized_ids = [primary]
    if not normalized_ids:
        raise HTTPException(status_code=400, detail="At least one category is required")

    existing_ids = {
        row[0]
        for row in db.query(Category.id).filter(Category.id.in_(normalized_ids)).all()
    }
    normalized_ids = [category_id for category_id in normalized_ids if category_id in existing_ids]
    if not normalized_ids:
        raise HTTPException(status_code=400, detail="Category not found")

    if primary is not None:
        if primary not in existing_ids:
            raise HTTPException(status_code=400, detail="Primary category not found")
        product.category_id = primary
    elif product.category_id not in normalized_ids:
        product.category_id = normalized_ids[0]

    db.query(ProductCategory).filter(ProductCategory.product_id == product.id).delete()
    for category_id in normalized_ids:
        db.add(ProductCategory(product_id=product.id, category_id=category_id))


def add_product_to_category(db: Session, product: Product, category_id: int) -> None:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")

    exists = (
        db.query(ProductCategory.product_id)
        .filter(ProductCategory.product_id == product.id, ProductCategory.category_id == category_id)
        .first()
    )
    if exists:
        return
    db.add(ProductCategory(product_id=product.id, category_id=category_id))


def remove_product_from_category(db: Session, product: Product, category_id: int) -> None:
    if product.category_id == category_id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя убрать основную категорию. Сначала назначьте другую основную категорию товару.",
        )
    deleted = (
        db.query(ProductCategory)
        .filter(ProductCategory.product_id == product.id, ProductCategory.category_id == category_id)
        .delete()
    )
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Product is not linked to this category")
