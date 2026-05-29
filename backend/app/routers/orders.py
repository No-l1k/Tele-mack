import hashlib
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..config import settings
from ..deps import get_current_admin, get_current_user
from ..models import Order, OrderItem, User
from ..schemas import ApiResponse, OrderCreate, OrderPublicLookupIn, OrderStatusUpdate, OrderUpdate
from ..services.csv_export import excel_csv_response
from ..services.notifications import email_notifications_enabled, send_new_order_email
from ..services.order_computation import compute_order
from ..services.orders import order_to_dict
from ..services.order_numbers import allocate_next_order_id
from ..services.store_settings import min_order_subtotal_rub

router = APIRouter(prefix="/orders", tags=["orders"])
logger = logging.getLogger(__name__)
ALLOWED_ORDER_STATUSES = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
ALLOWED_PAYMENT_METHODS = {"cash", "card", "pickup"}
ALLOWED_DELIVERY_METHODS = {"courier", "pickup"}


def _public_order_token(order: Order) -> str:
    payload = f"{order.id}:{order.customer_phone or ''}:{settings.secret_key}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


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

    computed = compute_order(
        db,
        items=payload.items,
        payment_method=payload.paymentMethod,
        delivery_method=payload.deliveryMethod,
        service_ids=payload.serviceIds,
        pixel_check=payload.pixelCheck,
        installation=payload.installation,
        check_availability=True,
        lock_products=True,
    )

    min_sum = min_order_subtotal_rub(db)
    if computed.subtotal < min_sum:
        raise HTTPException(
            status_code=400,
            detail=f"Минимальная сумма заказа {min_sum} руб. (сейчас товаров на {computed.subtotal} руб.)",
        )
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
        id=allocate_next_order_id(db),
        user_id=order_user_id,
        status="pending",
        total=computed.total,
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
        pixel_check=computed.pixel_check,
        installation=computed.installation,
        selected_services=computed.selected_services,
        services_total=computed.services_total,
        items=computed.order_items,
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


@router.put("/{order_id}", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def update_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)):
    if payload.paymentMethod not in ALLOWED_PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    if payload.deliveryMethod not in ALLOWED_DELIVERY_METHODS:
        raise HTTPException(status_code=400, detail="Invalid delivery method")

    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    computed = compute_order(
        db,
        items=payload.items,
        payment_method=payload.paymentMethod,
        delivery_method=payload.deliveryMethod,
        service_ids=payload.serviceIds,
        pixel_check=payload.pixelCheck,
        installation=payload.installation,
        check_availability=False,
        lock_products=False,
        allow_custom_price=True,
    )

    order.items.clear()
    for item in computed.order_items:
        item.order_id = order.id
        order.items.append(item)

    order.total = computed.total
    order.delivery_method = payload.deliveryMethod
    order.payment_method = payload.paymentMethod
    order.customer_name = payload.name
    order.customer_phone = payload.phone
    order.customer_email = payload.email
    order.address_city = payload.city
    order.address_street = payload.street
    order.address_house = payload.house
    order.address_apartment = payload.apartment
    order.comment = payload.comment
    order.pixel_check = computed.pixel_check
    order.installation = computed.installation
    order.selected_services = computed.selected_services
    order.services_total = computed.services_total
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return ApiResponse(data=order_to_dict(order))


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
    def order_rows():
        for row in query.order_by(Order.created_at.desc()).yield_per(500):
            yield [
                row.id,
                row.created_at.isoformat(),
                row.status,
                row.payment_status,
                row.customer_name,
                row.customer_phone,
                row.total,
            ]

    return excel_csv_response(
        "orders.csv",
        ["id", "createdAt", "status", "paymentStatus", "customerName", "phone", "total"],
        order_rows(),
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
