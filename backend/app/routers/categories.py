import re
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_admin
from ..config import settings
from ..rate_limit import rate_limit
from ..models import Category, Product
from ..schemas import ApiResponse, CategoryBase, CategoryUpdateIn

router = APIRouter(prefix="/categories", tags=["categories"])
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _validate_slug(slug: str) -> str:
    normalized = (slug or "").strip().lower()
    if not SLUG_PATTERN.fullmatch(normalized):
        raise HTTPException(
            status_code=400,
            detail="Invalid slug format. Use lowercase latin letters, numbers and hyphen.",
        )
    return normalized


def _is_descendant(db: Session, possible_child_id: int, possible_parent_id: int) -> bool:
    current_id = possible_child_id
    while current_id is not None:
        category = db.query(Category).filter(Category.id == current_id).first()
        if not category or category.parent_id is None:
            return False
        if category.parent_id == possible_parent_id:
            return True
        current_id = category.parent_id
    return False


def _build_category_payloads(db: Session) -> tuple[list[Category], dict[int, int], dict[int | None, list[Category]]]:
    categories = db.query(Category).order_by(Category.sort_order.asc()).all()
    direct_counts = {
        int(category_id): int(count)
        for category_id, count in db.query(Product.category_id, func.count(Product.id)).group_by(Product.category_id).all()
    }
    by_parent: dict[int | None, list[Category]] = {}
    for category in categories:
        by_parent.setdefault(category.parent_id, []).append(category)
    return categories, direct_counts, by_parent


def _count_with_descendants(
    category_id: int,
    direct_counts: dict[int, int],
    by_parent: dict[int | None, list[Category]],
    cache: dict[int, int],
) -> int:
    if category_id in cache:
        return cache[category_id]
    total = direct_counts.get(category_id, 0)
    for child in by_parent.get(category_id, []):
        total += _count_with_descendants(child.id, direct_counts, by_parent, cache)
    cache[category_id] = total
    return total


def category_to_dict(
    category: Category,
    include_children: bool,
    by_parent: dict[int | None, list[Category]],
    product_counts: dict[int, int],
) -> dict:
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "parentId": category.parent_id,
        "image": category.image,
        "description": category.description,
        "order": category.sort_order,
        "showOnHome": category.show_on_home,
        "productCount": product_counts.get(category.id, 0),
        "children": (
            [
                category_to_dict(child, include_children=True, by_parent=by_parent, product_counts=product_counts)
                for child in by_parent.get(category.id, [])
            ]
            if include_children
            else None
        ),
    }


@router.get("", response_model=ApiResponse)
def list_categories(db: Session = Depends(get_db)):
    rows, direct_counts, by_parent = _build_category_payloads(db)
    memo: dict[int, int] = {}
    product_counts = {category.id: _count_with_descendants(category.id, direct_counts, by_parent, memo) for category in rows}
    return ApiResponse(
        data=[
            category_to_dict(item, include_children=False, by_parent=by_parent, product_counts=product_counts)
            for item in rows
        ]
    )


@router.get("/tree", response_model=ApiResponse)
def list_categories_tree(db: Session = Depends(get_db)):
    rows, direct_counts, by_parent = _build_category_payloads(db)
    roots = by_parent.get(None, [])
    memo: dict[int, int] = {}
    product_counts = {category.id: _count_with_descendants(category.id, direct_counts, by_parent, memo) for category in rows}
    return ApiResponse(
        data=[
            category_to_dict(item, include_children=True, by_parent=by_parent, product_counts=product_counts)
            for item in roots
        ]
    )


@router.get("/slug/{slug}", response_model=ApiResponse)
def get_category_by_slug(slug: str, db: Session = Depends(get_db)):
    rows, direct_counts, by_parent = _build_category_payloads(db)
    category = next((item for item in rows if item.slug == slug), None)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    memo: dict[int, int] = {}
    product_counts = {item.id: _count_with_descendants(item.id, direct_counts, by_parent, memo) for item in rows}
    return ApiResponse(data=category_to_dict(category, include_children=False, by_parent=by_parent, product_counts=product_counts))


@router.get("/{category_id}", response_model=ApiResponse)
def get_category_by_id(category_id: int, db: Session = Depends(get_db)):
    rows, direct_counts, by_parent = _build_category_payloads(db)
    category = next((item for item in rows if item.id == category_id), None)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    memo: dict[int, int] = {}
    product_counts = {item.id: _count_with_descendants(item.id, direct_counts, by_parent, memo) for item in rows}
    return ApiResponse(data=category_to_dict(category, include_children=False, by_parent=by_parent, product_counts=product_counts))


@router.post("", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def create_category(payload: CategoryBase, db: Session = Depends(get_db)):
    slug = _validate_slug(payload.slug)
    if payload.parentId is not None:
        parent = db.query(Category).filter(Category.id == payload.parentId).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent category not found")
    category = Category(
        name=payload.name,
        slug=slug,
        parent_id=payload.parentId,
        image=payload.image,
        description=payload.description,
        sort_order=payload.order,
        show_on_home=payload.showOnHome,
    )
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Category with this slug already exists") from None
    db.refresh(category)
    rows, direct_counts, by_parent = _build_category_payloads(db)
    memo: dict[int, int] = {}
    product_counts = {item.id: _count_with_descendants(item.id, direct_counts, by_parent, memo) for item in rows}
    return ApiResponse(data=category_to_dict(category, include_children=False, by_parent=by_parent, product_counts=product_counts))


@router.put("/{category_id}", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def update_category(category_id: int, payload: CategoryUpdateIn, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if payload.name is not None:
        category.name = payload.name
    if payload.slug is not None:
        category.slug = _validate_slug(payload.slug)
    if "parentId" in payload.model_fields_set:
        if payload.parentId == category.id:
            raise HTTPException(status_code=400, detail="Category cannot be parent of itself")
        if payload.parentId is not None:
            parent = db.query(Category).filter(Category.id == payload.parentId).first()
            if not parent:
                raise HTTPException(status_code=400, detail="Parent category not found")
            if _is_descendant(db, possible_child_id=payload.parentId, possible_parent_id=category.id):
                raise HTTPException(status_code=400, detail="Category hierarchy cycle is not allowed")
        category.parent_id = payload.parentId
    if payload.image is not None:
        category.image = payload.image
    if payload.description is not None:
        category.description = payload.description
    if payload.order is not None:
        category.sort_order = payload.order
    if payload.showOnHome is not None:
        category.show_on_home = payload.showOnHome
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Category with this slug already exists") from None
    db.refresh(category)
    rows, direct_counts, by_parent = _build_category_payloads(db)
    memo: dict[int, int] = {}
    product_counts = {item.id: _count_with_descendants(item.id, direct_counts, by_parent, memo) for item in rows}
    return ApiResponse(data=category_to_dict(category, include_children=False, by_parent=by_parent, product_counts=product_counts))


@router.delete("/{category_id}", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    products_count = db.query(Product).filter(Product.category_id == category_id).count()
    if products_count > 0:
        raise HTTPException(
            status_code=409,
            detail="Нельзя удалить категорию, в которой есть товары. Перенесите или удалите товары.",
        )
    children_count = db.query(Category).filter(Category.parent_id == category_id).count()
    if children_count > 0:
        raise HTTPException(
            status_code=409,
            detail="Нельзя удалить категорию с подкатегориями. Сначала удалите или перенесите подкатегории.",
        )
    db.delete(category)
    db.commit()
    return ApiResponse(message="Category deleted")


@router.post("/{category_id}/image", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
async def upload_category_image(
    category_id: int,
    request: Request,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    rate_limit(request, key="category_image_upload", max_requests=20, window_seconds=60)
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    ext = Path(image.filename or "").suffix.lower() or ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    allowed_mime_types = {item.strip() for item in settings.allowed_image_mime_types.split(",") if item.strip()}
    if image.content_type not in allowed_mime_types:
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {image.content_type}")
    content = await image.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=413, detail="File is too large")

    upload_dir = Path(__file__).resolve().parents[2] / "uploads" / "categories"
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"category-{category_id}-{category.slug}{ext}"
    file_path = upload_dir / filename
    file_path.write_bytes(content)
    category.image = f"/uploads/categories/{filename}"
    db.commit()
    db.refresh(category)
    rows, direct_counts, by_parent = _build_category_payloads(db)
    memo: dict[int, int] = {}
    product_counts = {item.id: _count_with_descendants(item.id, direct_counts, by_parent, memo) for item in rows}
    return ApiResponse(data=category_to_dict(category, include_children=False, by_parent=by_parent, product_counts=product_counts))
