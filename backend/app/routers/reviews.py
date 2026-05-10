from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_admin, get_current_user
from ..models import Product, Review, User
from ..schemas import ApiResponse, ReviewCreateIn

router = APIRouter(prefix="/reviews", tags=["reviews"])


def review_to_dict(review: Review) -> dict:
    return {
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


def _recalc_product_rating(product: Product, db: Session) -> None:
    if product.rating_mode != "auto":
        return
    rows = db.query(Review).filter(Review.product_id == product.id, Review.approved.is_(True)).all()
    if not rows:
        product.rating = 0.0
        product.reviews_count = 0
        return
    product.reviews_count = len(rows)
    product.rating = round(sum(item.rating for item in rows) / len(rows), 2)


@router.get("")
def list_reviews(
    approved: bool | None = None,
    product_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    query = db.query(Review)
    if approved is not None:
        query = query.filter(Review.approved == approved)
    if product_id is not None:
        query = query.filter(Review.product_id == product_id)
    total = query.count()
    rows = query.order_by(Review.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "data": [review_to_dict(item) for item in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.get("/product/{product_id}")
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
        "data": [review_to_dict(item) for item in rows],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "totalPages": (total + page_size - 1) // page_size,
    }


@router.post("/product/{product_id}", response_model=ApiResponse)
def create_review(
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
    return ApiResponse(data=review_to_dict(review))


@router.put("/{review_id}/approve", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def approve_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.approved = True
    product = db.query(Product).filter(Product.id == review.product_id).first()
    if product:
        _recalc_product_rating(product, db)
    db.commit()
    db.refresh(review)
    return ApiResponse(data=review_to_dict(review))


@router.delete("/{review_id}", response_model=ApiResponse, dependencies=[Depends(get_current_admin)])
def delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    product = db.query(Product).filter(Product.id == review.product_id).first()
    db.delete(review)
    if product:
        _recalc_product_rating(product, db)
    db.commit()
    return ApiResponse(message="Review deleted")
