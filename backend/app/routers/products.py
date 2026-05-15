import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import asc
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy import desc
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from sqlalchemy.orm.attributes import flag_modified

from ..database import get_db
from ..deps import get_current_admin, get_current_user
from ..config import settings
from ..models import CartItem, Category, Favorite, OrderItem, Product, Review, User
from ..schemas import (
    ApiResponse,
    ProductBase,
    ProductImageDeleteIn,
    ProductImagesReorderIn,
    ProductUpdateIn,
    ReviewCreateIn,
)
from ..services.csv_export import excel_csv_response
from ..services.products import product_to_dict

router = APIRouter(prefix="/products", tags=["products"])
VALID_STOCK_STATUSES = {"in_stock", "low_stock", "preorder", "out_of_stock"}
VALID_RATING_MODES = {"manual", "auto"}
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _collect_descendant_ids(db: Session, root_id: int) -> list[int]:
    ids: list[int] = [root_id]
    frontier = [root_id]
    while frontier:
        children = db.query(Category.id).filter(Category.parent_id.in_(frontier)).all()
        frontier = [item[0] for item in children]
        ids.extend(frontier)
    return ids


def _normalize_brand(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    acronym_map = {"lg": "LG", "tcl": "TCL", "jbl": "JBL", "sony": "Sony", "samsung": "Samsung"}
    key = raw.lower()
    if key in acronym_map:
        return acronym_map[key]
    return " ".join(part.capitalize() for part in re.split(r"\s+", raw))


def _validate_stock_status(value: str) -> str:
    if value not in VALID_STOCK_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid stockStatus value")
    return value


def _validate_slug(value: str) -> str:
    normalized = (value or "").strip().lower()
    if not SLUG_PATTERN.fullmatch(normalized):
        raise HTTPException(
            status_code=400,
            detail="Invalid slug format. Use lowercase latin letters, numbers and hyphen.",
        )
    return normalized


def _validate_rating_mode(value: str) -> str:
    normalized = (value or "").strip().lower()
    if normalized not in VALID_RATING_MODES:
        raise HTTPException(status_code=400, detail="Invalid ratingMode value")
    return normalized


def _normalize_gtin(value: str | None) -> str | None:
    """GTIN/EAN: только цифры; пробелы убираются. Пустое поле → None."""
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    digits = "".join(c for c in raw if c.isdigit())
    if not digits:
        raise HTTPException(
            status_code=400,
            detail="В GTIN/EAN должны быть только цифры (допускаются пробелы между группами).",
        )
    if len(digits) not in (8, 12, 13, 14):
        raise HTTPException(
            status_code=400,
            detail="GTIN/EAN должен содержать ровно 8, 12, 13 или 14 цифр. Оставьте поле пустым, если штрихкод не нужен.",
        )
    return digits


def _apply_product_filters(
    query,
    db: Session,
    category: str | None,
    include_subcategories: bool,
    min_price: int | None,
    max_price: int | None,
    brands: str | None,
    in_stock: bool | None,
    is_new: bool | None,
    search: str | None,
):
    if category:
        category_row = db.query(Category).filter(Category.slug == category).first()
        if not category_row:
            return query.filter(Product.id == -1)
        category_ids = (
            _collect_descendant_ids(db, category_row.id)
            if include_subcategories
            else [category_row.id]
        )
        query = query.filter(Product.category_id.in_(category_ids))
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if brands:
        brand_list = [item.strip() for item in brands.split(",") if item.strip()]
        if brand_list:
            query = query.filter(Product.brand.in_(brand_list))
    if in_stock is not None:
        query = query.filter(Product.in_stock == in_stock)
    if is_new is not None:
        query = query.filter(Product.is_new == is_new)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    return query


def _uploads_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _unlink_local_upload_file(url: str) -> None:
    """Удаляет файл под backend/uploads, если путь безопасен и файл наш."""
    if not url.startswith("/uploads/"):
        return
    root = _uploads_root().resolve()
    target = (root / url.lstrip("/")).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректный путь к файлу") from None
    if target.is_file():
        target.unlink()


@router.get("")
def list_products(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category: str | None = None,
    include_subcategories: bool = True,
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    brands: str | None = None,
    in_stock: bool | None = None,
    is_new: bool | None = None,
    search: str | None = None,
    sort: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Product).options(joinedload(Product.category))
    query = _apply_product_filters(
        query=query,
        db=db,
        category=category,
        include_subcategories=include_subcategories,
        min_price=min_price,
        max_price=max_price,
        brands=brands,
        in_stock=in_stock,
        is_new=is_new,
        search=search,
    )
    if sort == "price-asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price-desc":
        query = query.order_by(Product.price.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating.desc())
    elif sort == "popular":
        query = query.order_by(Product.reviews_count.desc())
    else:
        query = query.order_by(desc(Product.created_at))
    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [product_to_dict(item) for item in products],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.get("/search")
def search_products(q: str = Query(min_length=1), page: int = 1, page_size: int = 20, db: Session = Depends(get_db)):
    query = db.query(Product).options(joinedload(Product.category)).filter(Product.name.ilike(f"%{q}%")).order_by(desc(Product.created_at))
    total = query.count()
    products = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [product_to_dict(item) for item in products],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.get("/new", response_model=ApiResponse)
def get_new_products(limit: int = Query(default=10, ge=1, le=100), db: Session = Depends(get_db)):
    rows = db.query(Product).options(joinedload(Product.category)).filter(Product.is_new.is_(True)).order_by(desc(Product.created_at)).limit(limit).all()
    return ApiResponse(data=[product_to_dict(item) for item in rows])


@router.get("/popular", response_model=ApiResponse)
def get_popular_products(limit: int = Query(default=10, ge=1, le=100), db: Session = Depends(get_db)):
    rows = db.query(Product).options(joinedload(Product.category)).order_by(Product.reviews_count.desc(), Product.rating.desc()).limit(limit).all()
    return ApiResponse(data=[product_to_dict(item) for item in rows])


@router.get("/brands", response_model=ApiResponse)
def get_brands(limit: int = Query(default=24, ge=1, le=200), db: Session = Depends(get_db)):
    rows = (
        db.query(Product.brand)
        .filter(Product.brand.isnot(None), Product.brand != "")
        .distinct()
        .order_by(Product.brand.asc())
        .limit(limit)
        .all()
    )
    return ApiResponse(data=[item[0] for item in rows])


@router.get("/filters/meta", response_model=ApiResponse)
def get_product_filters_meta(
    category: str | None = None,
    include_subcategories: bool = True,
    in_stock: bool | None = None,
    is_new: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    base_query = _apply_product_filters(
        query=db.query(Product),
        db=db,
        category=category,
        include_subcategories=include_subcategories,
        min_price=None,
        max_price=None,
        brands=None,
        in_stock=in_stock,
        is_new=is_new,
        search=search,
    )
    min_price, max_price = base_query.with_entities(func.min(Product.price), func.max(Product.price)).first() or (0, 0)
    min_i = int(min_price or 0)
    max_i = int(max_price or 0)
    # Один товар даёт min == max; Radix Slider и разметка фильтра ожидают max > min.
    if max_i <= min_i:
        max_i = min_i + 1000
    brand_rows = (
        base_query.with_entities(Product.brand)
        .filter(Product.brand.isnot(None), Product.brand != "")
        .distinct()
        .order_by(asc(Product.brand))
        .all()
    )
    return ApiResponse(
        data={
            "brands": [row[0] for row in brand_rows],
            "priceRange": {
                "min": min_i,
                "max": max_i,
            },
        }
    )


@router.get("/slug/{slug}", response_model=ApiResponse)
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).options(joinedload(Product.category)).filter(Product.slug == slug).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ApiResponse(data=product_to_dict(product))


@router.get("/export", dependencies=[Depends(get_current_admin)])
def export_products(db: Session = Depends(get_db)):
    query = db.query(Product).join(Category, Product.category_id == Category.id, isouter=True).order_by(Product.id.asc())

    def product_rows():
        for row in query.yield_per(500):
            payload = product_to_dict(row)
            yield [
                payload["name"],
                payload["price"],
                payload.get("categorySlug", ""),
                payload["quantity"],
                payload["description"],
                "|".join(payload.get("images", [])),
            ]

    return excel_csv_response(
        "products.csv",
        ["name", "price", "category", "stock", "description", "images"],
        product_rows(),
    )


@router.get("/{product_id}", response_model=ApiResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).options(joinedload(Product.category)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ApiResponse(data=product_to_dict(product))


@router.get("/{product_id}/related", response_model=ApiResponse)
def get_related_products(product_id: int, limit: int = Query(default=4, ge=1, le=24), db: Session = Depends(get_db)):
    product = db.query(Product).options(joinedload(Product.category)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    related = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.category_id == product.category_id, Product.id != product_id)
        .order_by(desc(Product.created_at))
        .limit(limit)
        .all()
    )
    return ApiResponse(data=[product_to_dict(item) for item in related])


@router.get("/{product_id}/reviews")
def get_product_reviews(
    product_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Review).filter(Review.product_id == product_id, Review.approved.is_(True))
    total = query.count()
    rows = query.order_by(Review.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [
            {
                "id": item.id,
                "productId": item.product_id,
                "userId": item.user_id,
                "userName": item.user_name,
                "rating": item.rating,
                "text": item.text,
                "pros": item.pros,
                "cons": item.cons,
                "approved": item.approved,
                "createdAt": item.created_at,
            }
            for item in rows
        ],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.post("/{product_id}/reviews", response_model=ApiResponse)
def create_product_review(
    product_id: int,
    payload: ReviewCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    review = Review(
        product_id=product.id,
        user_id=user.id,
        user_name=user.name,
        rating=payload.rating,
        text=payload.text,
        pros=payload.pros,
        cons=payload.cons,
        approved=False,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return ApiResponse(
        data={
            "id": review.id,
            "productId": review.product_id,
            "userId": review.user_id,
            "userName": review.user_name,
            "rating": review.rating,
            "text": review.text,
            "pros": review.pros,
            "cons": review.cons,
            "approved": review.approved,
            "createdAt": review.created_at,
        }
    )


@router.post("", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def create_product(payload: ProductBase, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == payload.categoryId).first()
    if not category:
        raise HTTPException(status_code=400, detail="Category not found")
    if payload.price < 0:
        raise HTTPException(status_code=400, detail="Price must be >= 0")
    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity must be >= 0")
    slug = _validate_slug(payload.slug)
    rating_mode = _validate_rating_mode(payload.ratingMode)

    stock_status = _validate_stock_status(payload.stockStatus)
    gtin_normalized = _normalize_gtin(payload.gtin)

    clean_specs = {key: value for key, value in (payload.specs or {}).items() if key != "images"}

    product = Product(
        name=payload.name,
        slug=slug,
        description=payload.description,
        short_description=payload.shortDescription,
        price=payload.price,
        old_price=payload.oldPrice,
        category_id=payload.categoryId,
        brand=_normalize_brand(payload.brand),
        sku=(payload.sku or "").strip() or None,
        gtin=gtin_normalized,
        specs=clean_specs,
        in_stock=stock_status in {"in_stock", "low_stock"},
        stock_status=stock_status,
        quantity=payload.quantity,
        is_new=payload.isNew,
        rating_mode=rating_mode,
        rating=payload.rating if rating_mode == "manual" else 0,
        reviews_count=payload.reviewsCount if rating_mode == "manual" else 0,
        warranty_months=payload.warrantyMonths,
        warranty_type=(payload.warrantyType or "").strip() or None,
        service_info=(payload.serviceInfo or "").strip() or None,
        meta_title=(payload.metaTitle or "").strip() or None,
        meta_description=(payload.metaDescription or "").strip() or None,
    )
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Product with this slug already exists") from None
    db.refresh(product)
    return ApiResponse(data=product_to_dict(product))


@router.post("/{product_id}/images", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
async def upload_product_images(product_id: int, images: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    upload_dir = Path(__file__).resolve().parents[2] / "uploads" / "products"
    upload_dir.mkdir(parents=True, exist_ok=True)
    # Новый dict — иначе SQLAlchemy может не зафиксировать изменение JSON-поля при мутации на месте.
    new_specs = dict(product.specs or {})
    existing_images = list(new_specs.get("images", []))
    uploaded_urls: list[str] = []
    allowed_mime_types = {item.strip() for item in settings.allowed_image_mime_types.split(",") if item.strip()}

    for image in images:
        ext = Path(image.filename or "").suffix.lower() or ".jpg"
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        if image.content_type not in allowed_mime_types:
            raise HTTPException(status_code=400, detail=f"Unsupported content type: {image.content_type}")
        filename = f"{product_id}-{uuid4().hex}{ext}"
        file_path = upload_dir / filename
        content = await image.read()
        if len(content) > settings.max_upload_size_bytes:
            raise HTTPException(status_code=413, detail=f"File is too large: {image.filename}")
        file_path.write_bytes(content)
        uploaded_urls.append(f"/uploads/products/{filename}")

    new_specs["images"] = [*existing_images, *uploaded_urls]
    product.specs = new_specs
    flag_modified(product, "specs")
    db.commit()
    db.refresh(product)
    return ApiResponse(data=new_specs["images"])


@router.put(
    "/{product_id}/images/order",
    response_model=ApiResponse,
    dependencies=[Depends(get_current_admin)],
)
def reorder_product_images(
    product_id: int,
    payload: ProductImagesReorderIn,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_specs = dict(product.specs or {})
    current = [str(u) for u in (new_specs.get("images") or [])]
    incoming = [str(u) for u in payload.images]
    if len(current) != len(incoming) or sorted(current) != sorted(incoming):
        raise HTTPException(
            status_code=400,
            detail="Список должен содержать те же изображения в новом порядке",
        )
    new_specs["images"] = incoming
    product.specs = new_specs
    flag_modified(product, "specs")
    db.commit()
    db.refresh(product)
    return ApiResponse(data=product_to_dict(product))


@router.delete(
    "/{product_id}/images",
    response_model=ApiResponse,
    dependencies=[Depends(get_current_admin)],
)
def delete_product_image(
    product_id: int,
    payload: ProductImageDeleteIn,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    url = (payload.url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Укажите url изображения")

    new_specs = dict(product.specs or {})
    current = list(new_specs.get("images", []))
    if url not in current:
        raise HTTPException(status_code=404, detail="Изображение не найдено у товара")

    new_specs["images"] = [u for u in current if u != url]
    product.specs = new_specs
    flag_modified(product, "specs")
    db.commit()
    db.refresh(product)

    try:
        _unlink_local_upload_file(url)
    except HTTPException:
        raise
    except OSError:
        pass

    return ApiResponse(data=product_to_dict(product))


@router.put("/{product_id}", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def update_product(product_id: int, payload: ProductUpdateIn, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.name is not None:
        product.name = payload.name
    if payload.slug is not None:
        product.slug = _validate_slug(payload.slug)
    if payload.description is not None:
        product.description = payload.description
    if payload.shortDescription is not None:
        product.short_description = payload.shortDescription
    if payload.price is not None:
        product.price = payload.price
    if payload.oldPrice is not None:
        product.old_price = payload.oldPrice
    if payload.categoryId is not None:
        category = db.query(Category).filter(Category.id == payload.categoryId).first()
        if not category:
            raise HTTPException(status_code=400, detail="Category not found")
        product.category_id = payload.categoryId
    if payload.brand is not None:
        product.brand = _normalize_brand(payload.brand)
    if payload.sku is not None:
        product.sku = (payload.sku or "").strip() or None
    if payload.gtin is not None:
        product.gtin = _normalize_gtin(payload.gtin)
    if payload.specs is not None:
        existing_images = (product.specs or {}).get("images", [])
        clean_specs = {key: value for key, value in payload.specs.items() if key != "images"}
        if existing_images:
            clean_specs["images"] = existing_images
        product.specs = clean_specs
    if payload.inStock is not None:
        product.in_stock = payload.inStock
    if payload.stockStatus is not None:
        status = _validate_stock_status(payload.stockStatus)
        product.stock_status = status
        product.in_stock = status in {"in_stock", "low_stock"}
    if payload.quantity is not None:
        if payload.quantity < 0:
            raise HTTPException(status_code=400, detail="Quantity must be >= 0")
        product.quantity = payload.quantity
    if payload.isNew is not None:
        product.is_new = payload.isNew
    if payload.ratingMode is not None:
        product.rating_mode = _validate_rating_mode(payload.ratingMode)
        if product.rating_mode == "auto":
            product.rating = 0
            product.reviews_count = 0
    if payload.rating is not None and product.rating_mode == "manual":
        product.rating = payload.rating
    if payload.reviewsCount is not None and product.rating_mode == "manual":
        product.reviews_count = payload.reviewsCount
    if payload.warrantyMonths is not None:
        product.warranty_months = payload.warrantyMonths
    if payload.warrantyType is not None:
        product.warranty_type = (payload.warrantyType or "").strip() or None
    if payload.serviceInfo is not None:
        product.service_info = (payload.serviceInfo or "").strip() or None
    if payload.metaTitle is not None:
        product.meta_title = (payload.metaTitle or "").strip() or None
    if payload.metaDescription is not None:
        product.meta_description = (payload.metaDescription or "").strip() or None
    if payload.price is not None and payload.price < 0:
        raise HTTPException(status_code=400, detail="Price must be >= 0")
    if product.quantity <= 0 and product.stock_status == "in_stock":
        product.in_stock = False
        product.stock_status = "out_of_stock"
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Product with this slug already exists") from None
    db.refresh(product)
    return ApiResponse(data=product_to_dict(product))


@router.delete("/{product_id}", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    order_items_count = db.query(OrderItem).filter(OrderItem.product_id == product_id).count()
    if order_items_count > 0:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete product used in orders. Mark it out of stock instead.",
        )
    db.query(CartItem).filter(CartItem.product_id == product_id).delete()
    db.query(Favorite).filter(Favorite.product_id == product_id).delete()
    db.query(Review).filter(Review.product_id == product_id).delete()

    specs_dict = product.specs if isinstance(product.specs, dict) else {}
    for url in specs_dict.get("images") or []:
        if not isinstance(url, str):
            continue
        try:
            _unlink_local_upload_file(url.strip())
        except HTTPException:
            pass
        except OSError:
            pass

    db.delete(product)
    db.commit()
    return ApiResponse(message="Product deleted")
