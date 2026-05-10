import csv
import hashlib
import io
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..config import settings
from ..deps import get_current_admin, get_current_user
from ..models import Order, OrderItem, Product, Setting, User
from ..schemas import ApiResponse, OrderCreate, OrderPublicLookupIn, OrderStatusUpdate
from ..services.notifications import email_notifications_enabled, send_new_order_email
from ..services.orders import order_to_dict

router = APIRouter(prefix="/orders", tags=["orders"])
logger = logging.getLogger(__name__)
ALLOWED_ORDER_STATUSES = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
ALLOWED_PAYMENT_METHODS = {"cash", "card", "pickup"}
ALLOWED_DELIVERY_METHODS = {"courier", "pickup"}
COURIER_DELIVERY_COST = 1000
DEFAULT_CHECKOUT_SERVICES = [
    {"id": "pixel-check", "name": "Проверка на битые пиксели", "price": 1500, "enabled": True},
    {"id": "installation", "name": "Установка телевизора", "price": 3000, "enabled": True},
    {"id": "bracket-selection", "name": "Подбор кронштейна для ТВ", "price": 0, "enabled": True},
    {"id": "extended-warranty-2y", "name": "Расширенная гарантия на 2 года", "price": 1843, "enabled": True},
    {"id": "extended-warranty-3y", "name": "Расширенная гарантия на 3 года", "price": 2765, "enabled": True},
]


def _public_order_token(order: Order) -> str:
    payload = f"{order.id}:{order.customer_phone or ''}:{settings.secret_key}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _checkout_services_map(db: Session) -> dict[str, dict[str, object]]:
    row = db.query(Setting).filter(Setting.key == "store").first()
    settings_data = dict(row.value or {}) if row else {}
    services = settings_data.get("checkoutServices")
    if not isinstance(services, list):
        services = []
    result: dict[str, dict[str, object]] = {}
    for service in [*DEFAULT_CHECKOUT_SERVICES, *services]:
        if not isinstance(service, dict):
            continue
        service_id = str(service.get("id", "")).strip()
        name = str(service.get("name", "")).strip()
        if not service_id or not name or not bool(service.get("enabled", True)):
            continue
        result[service_id] = {
            "id": service_id,
            "name": name,
            "price": max(int(service.get("price", 0) or 0), 0),
        }
    return result


def _normalize_phone(value: str | None) -> str:
    if not value:
        return ""
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) > 10:
        digits = digits[-10:]
    return digits


@router.get("")
def list_orders(
    status: str | None = None,
    user_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Order)
    if user.role != "admin":
        query = query.filter(Order.user_id == user.id)
    elif user_id:
        query = query.filter(Order.user_id == user_id)
    if status:
        query = query.filter(Order.status == status)
    query = query.options(selectinload(Order.items).joinedload(OrderItem.product))
    total = query.count()
    rows = query.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [order_to_dict(item) for item in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.post("", response_model=ApiResponse)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    if payload.paymentMethod not in ALLOWED_PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    if payload.deliveryMethod not in ALLOWED_DELIVERY_METHODS:
        raise HTTPException(status_code=400, detail="Invalid delivery method")
    subtotal = 0
    order_items: list[OrderItem] = []
    for item in payload.items:
        quantity = item.quantity
        product = db.query(Product).filter(Product.id == item.productId).with_for_update().first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product not found: {item.productId}")
        if not product.in_stock or product.quantity < quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for product: {product.name}")

        price = int(product.price)
        line_total = quantity * price
        subtotal += line_total

        product.quantity -= quantity
        if product.quantity <= 0:
            product.quantity = 0
            product.in_stock = False

        images = (product.specs or {}).get("images", [])
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                product_image=images[0] if images else None,
                product_sku=(product.sku or "").strip() or None,
                price=price,
                quantity=quantity,
                total=line_total,
            )
        )

    surcharge = 0
    if payload.paymentMethod == "card":
        surcharge = int(subtotal * 0.15)
    services_map = _checkout_services_map(db)
    selected_service_ids = set(payload.serviceIds or [])
    # Legacy compatibility for old frontend payloads.
    if payload.pixelCheck:
        selected_service_ids.add("pixel-check")
    if payload.installation:
        selected_service_ids.add("installation")
    selected_services = [services_map[service_id] for service_id in selected_service_ids if service_id in services_map]
    services_total = sum(int(service["price"]) for service in selected_services)
    delivery_cost = 0
    if payload.deliveryMethod == "courier":
        delivery_cost = COURIER_DELIVERY_COST
    total = subtotal + surcharge + services_total + delivery_cost
    order_user_id = None
    if payload.becomeCustomer:
        existing = db.query(User).filter(User.phone == payload.phone).first()
        if existing:
            order_user_id = existing.id
        else:
            created_user = User(phone=payload.phone, name=payload.name, email=payload.email, role="customer")
            db.add(created_user)
            db.flush()
            order_user_id = created_user.id

    order = Order(
        user_id=order_user_id,
        status="pending",
        total=total,
        payment_status="pending",
        delivery_method=payload.deliveryMethod,
        payment_method=payload.paymentMethod,
        customer_name=payload.name,
        customer_phone=payload.phone,
        customer_email=payload.email,
        address_city=payload.city,
        address_street=payload.street,
        address_house=payload.house,
        address_apartment=payload.apartment,
        comment=payload.comment,
        pixel_check=("pixel-check" in selected_service_ids) or payload.pixelCheck,
        installation=("installation" in selected_service_ids) or payload.installation,
        selected_services=selected_services,
        services_total=services_total,
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    if email_notifications_enabled():
        try:
            send_new_order_email(order)
        except Exception:
            logger.exception("Failed to send new order notification email for order_id=%s", order.id)
    data = order_to_dict(order)
    data["publicToken"] = _public_order_token(order)
    return ApiResponse(data=data)


@router.put("/{order_id}/status", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if payload.status not in ALLOWED_ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid order status")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return ApiResponse(data=order_to_dict(order))


@router.put("/{order_id}/payment", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def mark_order_paid(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.payment_status = "paid"
    db.commit()
    db.refresh(order)
    return ApiResponse(data=order_to_dict(order))


@router.get("/stats", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def orders_stats(period: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Order)
    if period == "today":
        query = query.filter(Order.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0))
    elif period == "week":
        query = query.filter(Order.created_at >= datetime.utcnow() - timedelta(days=7))
    elif period == "month":
        query = query.filter(Order.created_at >= datetime.utcnow() - timedelta(days=30))
    elif period == "year":
        query = query.filter(Order.created_at >= datetime.utcnow() - timedelta(days=365))

    total = query.with_entities(func.count(Order.id)).scalar() or 0
    revenue = query.with_entities(func.coalesce(func.sum(Order.total), 0)).scalar() or 0
    by_status_rows = query.with_entities(Order.status, func.count(Order.id)).group_by(Order.status).all()
    by_status = {status: count for status, count in by_status_rows}
    return ApiResponse(data={"total": total, "revenue": revenue, "byStatus": by_status})


@router.get("/export", dependencies=[Depends(get_current_admin)])
def export_orders(
    status: str | None = None,
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    if from_date:
        try:
            query = query.filter(Order.created_at >= datetime.fromisoformat(from_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from date format") from None
    if to_date:
        try:
            query = query.filter(Order.created_at <= datetime.fromisoformat(to_date))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to date format") from None
    def stream_rows():
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["id", "createdAt", "status", "paymentStatus", "customerName", "phone", "total"])
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)

        for row in query.order_by(Order.created_at.desc()).yield_per(500):
            writer.writerow([row.id, row.created_at.isoformat(), row.status, row.payment_status, row.customer_name, row.customer_phone, row.total])
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)

    return StreamingResponse(
        stream_rows(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="orders.csv"'},
    )


@router.get("/public/{order_id}", response_model=ApiResponse)
def get_public_order(order_id: int, token: str, db: Session = Depends(get_db)):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if token != _public_order_token(order):
        raise HTTPException(status_code=403, detail="Forbidden")
    return ApiResponse(data=order_to_dict(order))


@router.post("/public/lookup", response_model=ApiResponse)
def lookup_public_order(payload: OrderPublicLookupIn, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == payload.orderNumber).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if _normalize_phone(order.customer_phone) != _normalize_phone(payload.phone):
        raise HTTPException(status_code=404, detail="Order not found")
    return ApiResponse(
        data={
            "orderId": order.id,
            "orderNumber": order.id,
            "publicToken": _public_order_token(order),
            "createdAt": order.created_at,
            "status": order.status,
        }
    )


@router.get("/{order_id}", response_model=ApiResponse)
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = (
        db.query(Order)
        .options(selectinload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role != "admin" and order.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return ApiResponse(data=order_to_dict(order))
