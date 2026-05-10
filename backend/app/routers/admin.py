import re
import threading
import unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal, get_db
from ..deps import get_current_admin
from ..models import Category, Order, OrderItem, Product, Setting, User
from ..schemas import ApiResponse, StoreSettingsUpdateIn
from ..rate_limit import rate_limit

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])
IMPORT_JOBS_LOCK = threading.Lock()
IMPORT_JOBS: dict[str, dict[str, object]] = {}

DEFAULT_STORE_SETTINGS = {
    "name": "Tele-makc",
    "phone": "+7(900)000-00-00",
    "email": "shop@example.com",
    "address": "Москва",
    "workingHours": "Пн-Вс: 9:00-21:00",
    "deliveryInfo": {"moscowFree": True, "moscowMinSum": 1, "regionCostPerKm": 50, "deliveryDays": "1-3 дня"},
    "paymentMethods": {"cash": True, "card": True, "cardSurcharge": 15, "pickup": True},
    "social": {"whatsapp": "+79000000000", "telegram": "@telemakc"},
    "heroBanners": [
        {"image": "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&q=80", "href": "/catalog/televizory"},
        {"image": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1200&q=80", "href": "/catalog/televizory"},
        {"image": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&q=80", "href": "/catalog/saundbary"},
    ],
    "checkoutServices": [
        {
            "id": "pixel-check",
            "name": "Проверка на битые пиксели",
            "price": 1500,
            "description": "Проверка экрана на наличие дефектных пикселей перед выдачей.",
            "enabled": True,
            "sortOrder": 1,
        },
        {
            "id": "installation",
            "name": "Установка телевизора",
            "price": 3000,
            "description": "Профессиональная установка и базовая настройка телевизора.",
            "enabled": True,
            "sortOrder": 2,
        },
        {
            "id": "bracket-selection",
            "name": "Подбор кронштейна для ТВ",
            "price": 0,
            "description": "подробнее",
            "enabled": True,
            "sortOrder": 3,
        },
        {
            "id": "extended-warranty-2y",
            "name": "Расширенная гарантия на 2 года",
            "price": 1843,
            "description": "Все заботы по ремонту мы возьмем на себя в течение 2 лет. Если товар не подлежит ремонту, обменяем его на новый той же модели.",
            "enabled": True,
            "sortOrder": 4,
        },
        {
            "id": "extended-warranty-3y",
            "name": "Расширенная гарантия на 3 года",
            "price": 2765,
            "description": "Все заботы по ремонту мы возьмем на себя в течение 3 лет. Если товар не подлежит ремонту, обменяем его на новый той же модели.",
            "enabled": True,
            "sortOrder": 5,
        },
    ],
}


def _normalize_hero_banners(value: object) -> list[dict[str, str]]:
    items = value if isinstance(value, list) else []
    normalized: list[dict[str, str]] = []
    for item in items:
        if isinstance(item, str):
            image = item.strip()
            if image:
                normalized.append({"image": image, "href": ""})
            continue
        if isinstance(item, dict):
            image = str(item.get("image", "")).strip()
            if not image:
                continue
            href = str(item.get("href", "")).strip()
            normalized.append({"image": image, "href": href})
    return normalized


def _normalize_checkout_services(value: object) -> list[dict[str, object]]:
    def _normalize_list(raw: object) -> list[dict[str, object]]:
        items = raw if isinstance(raw, list) else []
        normalized_list: list[dict[str, object]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            service_id = str(item.get("id", "")).strip()
            name = str(item.get("name", "")).strip()
            if not service_id or not name:
                continue
            normalized_list.append(
                {
                    "id": service_id,
                    "name": name,
                    "price": max(int(item.get("price", 0) or 0), 0),
                    "description": str(item.get("description", "")).strip() or None,
                    "enabled": bool(item.get("enabled", True)),
                    "sortOrder": int(item.get("sortOrder", 0) or 0),
                }
            )
        return normalized_list

    default_services = _normalize_list(DEFAULT_STORE_SETTINGS["checkoutServices"])
    normalized = _normalize_list(value)
    merged: dict[str, dict[str, object]] = {str(service["id"]): service for service in default_services}
    for service in normalized:
        merged[str(service["id"])] = service
    return sorted(list(merged.values()), key=lambda service: int(service["sortOrder"]))


@router.get("/stats", response_model=ApiResponse)
def dashboard_stats(db: Session = Depends(get_db)):
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_revenue = db.query(func.coalesce(func.sum(Order.total), 0)).scalar() or 0
    pending_orders = db.query(func.count(Order.id)).filter(Order.status == "pending").scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    today = datetime.utcnow() - timedelta(days=1)
    orders_today = db.query(func.count(Order.id)).filter(Order.created_at >= today).scalar() or 0
    revenue_today = db.query(func.coalesce(func.sum(Order.total), 0)).filter(Order.created_at >= today).scalar() or 0
    return ApiResponse(
        data={
            "totalOrders": total_orders,
            "totalRevenue": total_revenue,
            "pendingOrders": pending_orders,
            "totalProducts": total_products,
            "totalUsers": total_users,
            "ordersToday": orders_today,
            "revenueToday": revenue_today,
        }
    )


@router.get("/analytics", response_model=ApiResponse)
def analytics(period: str = "month", db: Session = Depends(get_db)):
    days = 30
    if period == "week":
        days = 7
    elif period == "year":
        days = 365
    start_date = datetime.utcnow() - timedelta(days=days)

    orders = db.query(Order).filter(Order.created_at >= start_date).all()
    revenue_map: dict[str, int] = {}
    orders_map: dict[str, int] = {}
    for order in orders:
        day = order.created_at.strftime("%Y-%m-%d")
        revenue_map[day] = revenue_map.get(day, 0) + int(order.total)
        orders_map[day] = orders_map.get(day, 0) + 1

    product_sales = (
        db.query(Product.id, Product.name, func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(OrderItem, OrderItem.product_id == Product.id, isouter=True)
        .join(Order, Order.id == OrderItem.order_id, isouter=True)
        .filter((Order.created_at >= start_date) | (Order.created_at.is_(None)))
        .group_by(Product.id, Product.name)
        .order_by(func.coalesce(func.sum(OrderItem.quantity), 0).desc())
        .limit(10)
        .all()
    )
    top_products = [{"product": {"id": pid, "name": name}, "soldCount": sold} for pid, name, sold in product_sales]

    category_revenue = (
        db.query(Category.id, Category.name, func.coalesce(func.sum(OrderItem.total), 0))
        .join(Product, Product.category_id == Category.id, isouter=True)
        .join(OrderItem, OrderItem.product_id == Product.id, isouter=True)
        .join(Order, Order.id == OrderItem.order_id, isouter=True)
        .filter((Order.created_at >= start_date) | (Order.created_at.is_(None)))
        .group_by(Category.id, Category.name)
        .order_by(func.coalesce(func.sum(OrderItem.total), 0).desc())
        .limit(10)
        .all()
    )
    top_categories = [{"category": {"id": cid, "name": name}, "revenue": revenue} for cid, name, revenue in category_revenue]

    return ApiResponse(
        data={
            "revenue": [{"date": key, "amount": value} for key, value in sorted(revenue_map.items())],
            "orders": [{"date": key, "count": value} for key, value in sorted(orders_map.items())],
            "topProducts": top_products,
            "topCategories": top_categories,
        }
    )


@router.get("/settings", response_model=ApiResponse)
def get_settings(db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == "store").first()
    if not row:
        row = Setting(key="store", value=DEFAULT_STORE_SETTINGS.copy())
        db.add(row)
        db.commit()
        db.refresh(row)
    settings_data = dict(row.value or {})
    settings_data["heroBanners"] = _normalize_hero_banners(settings_data.get("heroBanners"))
    settings_data["checkoutServices"] = _normalize_checkout_services(
        settings_data.get("checkoutServices", DEFAULT_STORE_SETTINGS["checkoutServices"])
    )
    if settings_data != row.value:
        row.value = settings_data
        db.commit()
        db.refresh(row)
    return ApiResponse(data=row.value)


@router.put("/settings", response_model=ApiResponse)
def update_settings(payload: StoreSettingsUpdateIn, db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == "store").first()
    if not row:
        row = Setting(key="store", value=DEFAULT_STORE_SETTINGS.copy())
        db.add(row)
        db.flush()
    # Копия обязательна: мутация исходного JSON может не отслеживаться ORM.
    settings_data = dict(row.value or {})
    payload_data = payload.model_dump(exclude_unset=True)
    settings_data.update(payload_data)
    if "heroBanners" in payload_data:
        settings_data["heroBanners"] = _normalize_hero_banners(payload_data.get("heroBanners"))
    if "checkoutServices" in payload_data:
        settings_data["checkoutServices"] = _normalize_checkout_services(payload_data.get("checkoutServices"))
    row.value = settings_data
    db.commit()
    db.refresh(row)
    return ApiResponse(data=row.value)


@router.post("/settings/hero-images", response_model=ApiResponse)
async def upload_hero_images(request: Request, images: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    rate_limit(request, key="admin_hero_upload", max_requests=15, window_seconds=60)
    row = db.query(Setting).filter(Setting.key == "store").first()
    if not row:
        row = Setting(key="store", value=DEFAULT_STORE_SETTINGS.copy())
        db.add(row)
        db.flush()

    settings_data = dict(row.value or {})
    existing_images = _normalize_hero_banners(settings_data.get("heroBanners"))
    allowed_mime_types = {item.strip() for item in settings.allowed_image_mime_types.split(",") if item.strip()}
    # Не «banners» в URL: браузерные блокировщики режут пути с /banner(s)/ как рекламу (net::ERR_BLOCKED_BY_CLIENT).
    upload_dir = Path(__file__).resolve().parents[2] / "uploads" / "hero"
    upload_dir.mkdir(parents=True, exist_ok=True)
    uploaded_urls: list[str] = []

    if len(images) > 20:
        raise HTTPException(status_code=400, detail="Too many images in one request")
    for image in images:
        ext = Path(image.filename or "").suffix.lower() or ".jpg"
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
        if image.content_type not in allowed_mime_types:
            raise HTTPException(status_code=400, detail=f"Unsupported content type: {image.content_type}")

        content = await image.read()
        if len(content) > settings.max_upload_size_bytes:
            raise HTTPException(status_code=413, detail=f"File is too large: {image.filename}")

        filename = f"hero-{uuid4().hex}{ext}"
        file_path = upload_dir / filename
        file_path.write_bytes(content)
        uploaded_urls.append(f"/uploads/hero/{filename}")

    settings_data["heroBanners"] = [*existing_images, *({"image": url, "href": ""} for url in uploaded_urls)]
    row.value = settings_data
    db.commit()
    db.refresh(row)
    return ApiResponse(data=settings_data["heroBanners"])


@router.delete("/settings/hero-images", response_model=ApiResponse)
def delete_hero_image(url: str, db: Session = Depends(get_db)):
    row = db.query(Setting).filter(Setting.key == "store").first()
    if not row:
        raise HTTPException(status_code=404, detail="Settings not found")

    settings_data = dict(row.value or {})
    current = _normalize_hero_banners(settings_data.get("heroBanners"))
    if not any(item.get("image") == url for item in current):
        raise HTTPException(status_code=404, detail="Image not found")

    removed = False
    next_banners: list[dict[str, str]] = []
    for item in current:
        if not removed and item.get("image") == url:
            removed = True
            continue
        next_banners.append(item)
    settings_data["heroBanners"] = next_banners
    row.value = settings_data
    db.commit()
    db.refresh(row)

    allowed_prefixes = ("/uploads/banners/", "/uploads/hero/")
    if url.startswith(allowed_prefixes):
        root = Path(__file__).resolve().parents[2]
        target = (root / url.lstrip("/")).resolve()
        try:
            target.relative_to(root.resolve())
        except ValueError:
            raise HTTPException(status_code=400, detail="Некорректный путь к файлу") from None
        if target.is_file():
            target.unlink()
        elif url.startswith("/uploads/banners/"):
            alt = url.replace("/uploads/banners/", "/uploads/hero/", 1)
            alt_target = (root / alt.lstrip("/")).resolve()
            try:
                alt_target.relative_to(root.resolve())
            except ValueError:
                pass
            elif alt_target.is_file():
                alt_target.unlink()

    return ApiResponse(data=settings_data["heroBanners"])


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value.strip().lower())
    slug = re.sub(r"[^\w]+", "-", normalized, flags=re.UNICODE).strip("-")
    return slug or "item"


def _parse_text(node: ET.Element | None) -> str:
    if node is None or node.text is None:
        return ""
    return node.text.strip()


def _set_import_job(job_id: str, **values):
    with IMPORT_JOBS_LOCK:
        current = IMPORT_JOBS.get(job_id, {})
        current.update(values)
        IMPORT_JOBS[job_id] = current


def _run_import_yml_job(job_id: str, content: bytes):
    db = SessionLocal()
    try:
        _set_import_job(job_id, status="running", startedAt=datetime.utcnow().isoformat())
        root = ET.fromstring(content)
        shop = root.find("shop")
        if shop is None:
            raise ValueError("Invalid YML format: <shop> node not found")
        categories_node = shop.find("categories")
        offers_node = shop.find("offers")
        if categories_node is None or offers_node is None:
            raise ValueError("Invalid YML format: <categories> or <offers> node missing")

        category_map: dict[str, int] = {}
        category_parent_ext: dict[str, str | None] = {}
        categories_created = 0
        categories_updated = 0

        for index, category_node in enumerate(categories_node.findall("category"), start=1):
            external_id = category_node.attrib.get("id")
            if not external_id:
                continue
            name = _parse_text(category_node)
            parent_id = category_node.attrib.get("parentId")
            slug = f"{_slugify(name)}-{external_id}"
            category = db.query(Category).filter(Category.slug == slug).first()
            description = f"Imported from YML. External ID: {external_id}. Parent ID: {parent_id or '-'}."
            if category:
                category.name = name or category.name
                category.description = description
                category.sort_order = index
                categories_updated += 1
            else:
                category = Category(
                    name=name or f"Category {external_id}",
                    slug=slug,
                    description=description,
                    sort_order=index,
                )
                db.add(category)
                db.flush()
                categories_created += 1
            category_map[external_id] = category.id
            category_parent_ext[external_id] = parent_id

        for external_id, parent_external_id in category_parent_ext.items():
            if not parent_external_id:
                continue
            child_id = category_map.get(external_id)
            parent_db_id = category_map.get(parent_external_id)
            if child_id and parent_db_id and child_id != parent_db_id:
                child = db.query(Category).filter(Category.id == child_id).first()
                if child:
                    child.parent_id = parent_db_id
        db.commit()

        offers = offers_node.findall("offer")
        total_offers = len(offers)
        products_created = 0
        products_updated = 0
        products_skipped = 0
        chunk_size = 250
        for index, offer_node in enumerate(offers, start=1):
            external_offer_id = offer_node.attrib.get("id")
            if not external_offer_id:
                products_skipped += 1
                continue
            category_external_id = _parse_text(offer_node.find("categoryId"))
            category_id = category_map.get(category_external_id)
            if not category_id:
                products_skipped += 1
                continue

            name = _parse_text(offer_node.find("name")) or f"Product {external_offer_id}"
            slug = f"{_slugify(name)}-{external_offer_id}"
            description = _parse_text(offer_node.find("description")) or "No description"
            short_description = (description[:497] + "...") if len(description) > 500 else description
            available = offer_node.attrib.get("available", "true").lower() == "true"
            price_text = _parse_text(offer_node.find("price")) or "0"
            old_price_text = _parse_text(offer_node.find("oldprice"))
            currency_id = _parse_text(offer_node.find("currencyId"))
            source_url = _parse_text(offer_node.find("url"))
            pictures = [_parse_text(pic) for pic in offer_node.findall("picture") if _parse_text(pic)]

            try:
                price = int(round(float(price_text)))
            except ValueError:
                products_skipped += 1
                continue

            old_price = None
            if old_price_text:
                try:
                    old_price = int(round(float(old_price_text)))
                except ValueError:
                    old_price = None

            product = db.query(Product).filter(Product.slug == slug).first()
            specs = (product.specs.copy() if product and product.specs else {})
            specs.update(
                {
                    "source": "yml_import",
                    "externalOfferId": external_offer_id,
                    "sourceUrl": source_url,
                    "currencyId": currency_id,
                    "images": pictures,
                }
            )

            if product:
                product.name = name
                product.description = description
                product.short_description = short_description
                product.price = price
                product.old_price = old_price
                product.category_id = category_id
                product.in_stock = available
                product.quantity = 1 if available else 0
                product.specs = specs
                products_updated += 1
            else:
                db.add(
                    Product(
                        name=name,
                        slug=slug,
                        description=description,
                        short_description=short_description,
                        price=price,
                        old_price=old_price,
                        category_id=category_id,
                        brand=name.split(" ")[0] if name else "",
                        in_stock=available,
                        quantity=1 if available else 0,
                        specs=specs,
                    )
                )
                products_created += 1

            if index % chunk_size == 0:
                db.commit()
                _set_import_job(
                    job_id,
                    progressPercent=round((index / max(total_offers, 1)) * 100, 2),
                    counters={
                        "categoriesCreated": categories_created,
                        "categoriesUpdated": categories_updated,
                        "productsCreated": products_created,
                        "productsUpdated": products_updated,
                        "productsSkipped": products_skipped,
                    },
                )

        db.commit()
        _set_import_job(
            job_id,
            status="completed",
            finishedAt=datetime.utcnow().isoformat(),
            progressPercent=100,
            counters={
                "categoriesCreated": categories_created,
                "categoriesUpdated": categories_updated,
                "productsCreated": products_created,
                "productsUpdated": products_updated,
                "productsSkipped": products_skipped,
            },
        )
    except Exception as exc:
        db.rollback()
        _set_import_job(
            job_id,
            status="failed",
            finishedAt=datetime.utcnow().isoformat(),
            error=str(exc),
        )
    finally:
        db.close()


@router.post("/import/yml", response_model=ApiResponse)
async def import_yml_catalog(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    rate_limit(request, key="admin_yml_upload", max_requests=4, window_seconds=60)
    if not file.filename.lower().endswith((".xml", ".yml")):
        raise HTTPException(status_code=400, detail="Only .xml or .yml files are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Uploaded file is too large")

    try:
        ET.fromstring(content)
    except ET.ParseError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid XML: {exc}") from exc

    job_id = uuid4().hex
    _set_import_job(
        job_id,
        status="queued",
        createdAt=datetime.utcnow().isoformat(),
        progressPercent=0,
        counters={
            "categoriesCreated": 0,
            "categoriesUpdated": 0,
            "productsCreated": 0,
            "productsUpdated": 0,
            "productsSkipped": 0,
        },
    )
    background_tasks.add_task(_run_import_yml_job, job_id, content)
    return ApiResponse(message="YML import started", data={"jobId": job_id, "status": "queued"})


@router.get("/import/yml/{job_id}", response_model=ApiResponse)
def get_import_yml_status(job_id: str):
    with IMPORT_JOBS_LOCK:
        job = IMPORT_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    return ApiResponse(data=job)
