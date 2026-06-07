import json
import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import and_, asc, desc, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from sqlalchemy.orm.attributes import flag_modified

from ..database import get_db, is_sqlite
from ..product_spec_templates import build_spec_facets, get_spec_template_for_category
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
from ..services.products import product_in_stock_from_status, product_to_dict

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


def _normalize_search_query(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


def _clean_optional_text(value: str | None) -> str | None:
    normalized = " ".join((value or "").strip().split())
    return normalized or None


def _search_tokens(value: str | None, min_len: int = 2) -> list[str]:
    normalized = _normalize_search_query(value)
    if not normalized:
        return []
    seen: set[str] = set()
    tokens: list[str] = []
    for token in normalized.split():
        if len(token) < min_len or token in seen:
            continue
        seen.add(token)
        tokens.append(token)
    return tokens


def _product_search_fields(product: Product) -> tuple[str, str, str, str, str]:
    return (
        (product.name or "").strip().casefold(),
        (product.brand or "").strip().casefold(),
        (product.sku or "").strip().casefold(),
        (product.gtin or "").strip().casefold(),
        (product.short_description or "").strip().casefold(),
    )


def _product_matches_token(product: Product, token: str) -> bool:
    token_cf = token.casefold()
    for field_value in _product_search_fields(product):
        if token_cf and token_cf in field_value:
            return True
    return False


def _search_relevance_score(product: Product, tokens: list[str], full_query: str) -> int:
    if not tokens and not full_query:
        return 0
    score = 0
    for field in _product_search_fields(product):
        if not field:
            continue
        if full_query and field == full_query:
            score = max(score, 80)
        elif full_query and field.startswith(full_query):
            score = max(score, 50)
        elif full_query and full_query in field:
            score = max(score, 30)
    for token in tokens:
        for field in _product_search_fields(product):
            if not field:
                continue
            if field == token:
                score = max(score, 40)
            elif field.startswith(token):
                score = max(score, 20)
            elif token in field:
                score = max(score, 10)
    return score


def _sql_search_token_clauses(tokens: list[str]):
    """SQL pre-filter (PostgreSQL ILIKE is Unicode case-insensitive; SQLite is not)."""
    per_token = []
    for token in tokens:
        pattern = f"%{token}%"
        per_token.append(
            or_(
                Product.name.ilike(pattern),
                Product.brand.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.gtin.ilike(pattern),
                Product.short_description.ilike(pattern),
            )
        )
    return per_token


def _product_matches_all_tokens(product: Product, tokens: list[str]) -> bool:
    return all(_product_matches_token(product, token) for token in tokens)


def _filter_products_by_tokens(products: list[Product], tokens: list[str]) -> list[Product]:
    if not tokens:
        return products
    return [product for product in products if _product_matches_all_tokens(product, tokens)]


def _parse_spec_filters(raw: str | None) -> dict[str, list[str]]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid spec_filters JSON") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="Invalid spec_filters JSON")
    parsed: dict[str, list[str]] = {}
    for key, value in data.items():
        key_str = str(key).strip()
        if not key_str:
            continue
        if isinstance(value, list):
            values = [str(item).strip() for item in value if str(item).strip()]
        else:
            values = [str(value).strip()] if str(value).strip() else []
        if values:
            parsed[key_str] = values
    return parsed


def _product_matches_spec_filters(product: Product, spec_filters: dict[str, list[str]]) -> bool:
    if not spec_filters:
        return True
    specs = product.specs if isinstance(product.specs, dict) else {}
    for key, selected_values in spec_filters.items():
        if not selected_values:
            continue
        raw = specs.get(key)
        if raw is None:
            return False
        product_value = str(raw).strip().casefold()
        allowed = {value.strip().casefold() for value in selected_values if value.strip()}
        if product_value not in allowed:
            return False
    return True


def _filter_products_by_spec_filters(products: list[Product], spec_filters: dict[str, list[str]]) -> list[Product]:
    if not spec_filters:
        return products
    return [product for product in products if _product_matches_spec_filters(product, spec_filters)]


def _apply_search_token_filter(query, search: str | None):
    tokens = _search_tokens(search)
    if not tokens:
        return query
    if is_sqlite:
        return query
    return query.filter(and_(*_sql_search_token_clauses(tokens)))


def _normalize_recommended_accessory_ids(
    db: Session,
    ids: list[int] | None,
    *,
    current_product_id: int | None = None,
) -> list[int]:
    if not ids:
        return []
    normalized: list[int] = []
    seen: set[int] = set()
    for raw in ids:
        try:
            value = int(raw)
        except (TypeError, ValueError):
            continue
        if value <= 0:
            continue
        if current_product_id is not None and value == current_product_id:
            continue
        if value in seen:
            continue
        normalized.append(value)
        seen.add(value)
    if not normalized:
        return []
    existing_ids = {
        item[0]
        for item in db.query(Product.id).filter(Product.id.in_(normalized)).all()
    }
    return [value for value in normalized if value in existing_ids]


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
        query = _apply_search_token_filter(query, search)
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
    spec_filters: str | None = Query(default=None, description="JSON map spec name -> list of values"),
    sort: str | None = None,
    db: Session = Depends(get_db),
):
    parsed_spec_filters = _parse_spec_filters(spec_filters)
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

    search_tokens = _search_tokens(search) if search else []
    needs_python_post_filter = (search_tokens and is_sqlite) or bool(parsed_spec_filters)
    if needs_python_post_filter:
        rows = query.all()
        if search_tokens and is_sqlite:
            rows = _filter_products_by_tokens(rows, search_tokens)
        if parsed_spec_filters:
            rows = _filter_products_by_spec_filters(rows, parsed_spec_filters)
        total = len(rows)
        start = (page - 1) * page_size
        products = rows[start : start + page_size]
    else:
        total = query.count()
        products = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [product_to_dict(item) for item in products],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


SEARCH_POOL_MAX = 500


@router.get("/search")
def search_products(
    q: str = Query(min_length=1),
    page: int = 1,
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    tokens = _search_tokens(q)
    full_query = _normalize_search_query(q)
    if not tokens:
        return {
            "data": [],
            "total": 0,
            "page": page,
            "pageSize": page_size,
            "totalPages": 0,
        }

    base = db.query(Product).options(joinedload(Product.category)).order_by(desc(Product.created_at))
    if is_sqlite:
        candidates = _filter_products_by_tokens(base.all(), tokens)
    else:
        candidates = base.filter(and_(*_sql_search_token_clauses(tokens))).limit(SEARCH_POOL_MAX).all()
        candidates = _filter_products_by_tokens(candidates, tokens)

    scored = [
        (product_to_dict(product), _search_relevance_score(product, tokens, full_query))
        for product in candidates
    ]
    scored.sort(key=lambda item: item[1], reverse=True)
    total = len(scored)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = [item[0] for item in scored[start:end]]

    return {
        "data": page_items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size if page_size else 0,
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
    spec_filters: str | None = Query(default=None, description="JSON map spec name -> list of values"),
    db: Session = Depends(get_db),
):
    parsed_spec_filters = _parse_spec_filters(spec_filters)
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
    category_row = db.query(Category).filter(Category.slug == category).first() if category else None
    template = (
        get_spec_template_for_category(name=category_row.name, slug=category_row.slug)
        if category_row
        else None
    )

    search_tokens = _search_tokens(search) if search else []

    def _load_rows_for_meta(*, apply_spec_filters: bool) -> list[Product]:
        rows = base_query.all()
        if search_tokens and is_sqlite:
            rows = _filter_products_by_tokens(rows, search_tokens)
        if apply_spec_filters and parsed_spec_filters:
            rows = _filter_products_by_spec_filters(rows, parsed_spec_filters)
        return rows

    # Варианты характеристик — по всей категории (без spec_filters), чтобы можно было комбинировать несколько.
    products_for_facets = _load_rows_for_meta(apply_spec_filters=False) if template else []

    rows_for_counts = _load_rows_for_meta(apply_spec_filters=True)
    if rows_for_counts:
        prices = [int(item.price or 0) for item in rows_for_counts]
        min_i = min(prices)
        max_i = max(prices)
        brands_list = sorted({item.brand for item in rows_for_counts if item.brand})
    else:
        min_i = 0
        max_i = 0
        brands_list = []

    if max_i <= min_i:
        max_i = min_i + 1000

    spec_facets = build_spec_facets(products_for_facets, template) if template else {}

    return ApiResponse(
        data={
            "brands": brands_list,
            "priceRange": {
                "min": min_i,
                "max": max_i,
            },
            "specFacets": spec_facets,
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
                payload["stockStatus"],
                payload["description"],
                "|".join(payload.get("images", [])),
            ]

    return excel_csv_response(
        "products.csv",
        ["name", "price", "category", "stockStatus", "description", "images"],
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


@router.get("/{product_id}/variants", response_model=ApiResponse)
def get_product_variants(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    variant_group = _clean_optional_text(product.variant_group)
    if not variant_group:
        return ApiResponse(data=[])

    rows = (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.variant_group == variant_group)
        .order_by(asc(Product.variant_value), asc(Product.name))
        .all()
    )
    return ApiResponse(data=[product_to_dict(item) for item in rows])


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
        in_stock=product_in_stock_from_status(stock_status),
        stock_status=stock_status,
        is_new=payload.isNew,
        rating_mode=rating_mode,
        rating=payload.rating if rating_mode == "manual" else 0,
        reviews_count=payload.reviewsCount if rating_mode == "manual" else 0,
        warranty_months=payload.warrantyMonths,
        warranty_type=(payload.warrantyType or "").strip() or None,
        service_info=(payload.serviceInfo or "").strip() or None,
        recommended_accessory_ids=_normalize_recommended_accessory_ids(db, payload.recommendedAccessoryIds) or None,
        variant_group=_clean_optional_text(payload.variantGroup),
        variant_name=_clean_optional_text(payload.variantName) or "Диагональ",
        variant_value=_clean_optional_text(payload.variantValue),
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
    if payload.stockStatus is not None:
        status = _validate_stock_status(payload.stockStatus)
        product.stock_status = status
        product.in_stock = product_in_stock_from_status(status)
    elif payload.inStock is not None:
        product.in_stock = payload.inStock
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
    if payload.recommendedAccessoryIds is not None:
        product.recommended_accessory_ids = (
            _normalize_recommended_accessory_ids(
                db,
                payload.recommendedAccessoryIds,
                current_product_id=product.id,
            )
            or None
        )
    if payload.variantGroup is not None:
        product.variant_group = _clean_optional_text(payload.variantGroup)
    if payload.variantName is not None:
        product.variant_name = _clean_optional_text(payload.variantName) or "Диагональ"
    if payload.variantValue is not None:
        product.variant_value = _clean_optional_text(payload.variantValue)
    if payload.metaTitle is not None:
        product.meta_title = (payload.metaTitle or "").strip() or None
    if payload.metaDescription is not None:
        product.meta_description = (payload.metaDescription or "").strip() or None
    if payload.price is not None and payload.price < 0:
        raise HTTPException(status_code=400, detail="Price must be >= 0")
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
