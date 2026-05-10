from fastapi import APIRouter, Depends, HTTPException
from fastapi import Query
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..deps import get_current_admin, get_current_user
from ..models import Favorite, Order, Product, User
from ..schemas import ApiResponse, UserUpdateIn
from ..services.orders import order_to_dict
from ..services.products import product_to_dict

router = APIRouter(prefix="/users", tags=["users"])


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "phone": user.phone,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "favorites": [item.product_id for item in user.favorites],
        "createdAt": user.created_at,
    }


@router.get("")
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    query = db.query(User).options(selectinload(User.favorites))
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [user_to_dict(item) for item in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.get("/me", response_model=ApiResponse)
def me(current_user: User = Depends(get_current_user)):
    return ApiResponse(data=user_to_dict(current_user))


@router.put("/me", response_model=ApiResponse)
def update_me(payload: UserUpdateIn, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.name is not None:
        current_user.name = payload.name
    if payload.email is not None:
        current_user.email = payload.email
    db.commit()
    db.refresh(current_user)
    return ApiResponse(data=user_to_dict(current_user))


@router.get("/me/orders")
def my_orders(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Order).options(selectinload(Order.items)).filter(Order.user_id == current_user.id)
    total = query.count()
    rows = query.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [order_to_dict(item) for item in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.post("/me/favorites/{product_id}", response_model=ApiResponse)
def add_to_favorites(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.product_id == product_id).first()
    if not existing:
        db.add(Favorite(user_id=current_user.id, product_id=product_id))
        db.commit()
    return ApiResponse(message="Added to favorites")


@router.delete("/me/favorites/{product_id}", response_model=ApiResponse)
def remove_from_favorites(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.product_id == product_id).first()
    if existing:
        db.delete(existing)
        db.commit()
    return ApiResponse(message="Removed from favorites")


@router.get("/me/favorites", response_model=ApiResponse)
def get_favorites(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = (
        db.query(Product)
        .join(Favorite, Favorite.product_id == Product.id)
        .filter(Favorite.user_id == current_user.id)
        .all()
    )
    return ApiResponse(data=[product_to_dict(item) for item in rows])


@router.get("/{user_id}", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).options(selectinload(User.favorites)).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ApiResponse(data=user_to_dict(user))
