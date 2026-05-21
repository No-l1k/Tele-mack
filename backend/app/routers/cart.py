from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import CartItem, Product, User
from ..schemas import ApiResponse, CartItemIn
from ..services.products import product_available_for_order, product_to_dict

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=ApiResponse)
def get_cart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = (
        db.query(CartItem)
        .options(selectinload(CartItem.product))
        .filter(CartItem.user_id == user.id)
        .all()
    )
    response_items = []
    total = 0
    total_units = 0
    for item in items:
        product = item.product
        if not product:
            continue
        line_total = product.price * item.quantity
        total += line_total
        total_units += item.quantity
        response_items.append(
            {
                "product": product_to_dict(product),
                "quantity": item.quantity,
            }
        )
    return ApiResponse(data={"items": response_items, "total": total, "itemsCount": total_units})


@router.post("/items", response_model=ApiResponse)
def add_to_cart(payload: CartItemIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == payload.productId).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    if not product_available_for_order(product):
        raise HTTPException(status_code=400, detail="Товар недоступен для заказа")
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == payload.productId)
        .first()
    )
    if cart_item:
        cart_item.quantity = cart_item.quantity + payload.quantity
    else:
        cart_item = CartItem(user_id=user.id, product_id=payload.productId, quantity=payload.quantity)
        db.add(cart_item)
    db.commit()
    return ApiResponse(message="Added to cart")


@router.delete("/items/{product_id}", response_model=ApiResponse)
def remove_from_cart(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.product_id == product_id)
        .first()
    )
    if cart_item:
        db.delete(cart_item)
        db.commit()
    return ApiResponse(message="Removed from cart")
