from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Category, Product


def seed(db: Session) -> None:
    categories_count = db.query(Category).count()
    products_count = db.query(Product).count()
    if categories_count > 0 or products_count > 0:
        print("Seed skipped: database already has categories or products.")
        return

    tv_category = Category(
        name="Телевизоры",
        slug="televizory",
        description="Тестовая категория для локального API режима.",
        image="/images/placeholders/category.svg",
        sort_order=1,
    )
    sound_category = Category(
        name="Саундбары",
        slug="saundbary",
        description="Тестовая категория для локального API режима.",
        image="/images/placeholders/category.svg",
        sort_order=2,
    )
    db.add_all([tv_category, sound_category])
    db.flush()

    products = [
        Product(
            name='Samsung QE65Q80D',
            slug='samsung-qe65q80d',
            description='Демонстрационный товар для проверки API витрины.',
            short_description='QLED телевизор 65 дюймов',
            price=129990,
            old_price=149990,
            category_id=tv_category.id,
            brand='Samsung',
            specs={"images": ["/images/placeholders/product.svg"]},
            in_stock=True,
            quantity=8,
            is_new=True,
            rating=4.7,
            reviews_count=12,
        ),
        Product(
            name='LG S80TR Soundbar',
            slug='lg-s80tr-soundbar',
            description='Демонстрационный саундбар для локального API режима.',
            short_description='Саундбар 5.1.3',
            price=49990,
            old_price=None,
            category_id=sound_category.id,
            brand='LG',
            specs={"images": ["/images/placeholders/product.svg"]},
            in_stock=True,
            quantity=15,
            is_new=False,
            rating=4.5,
            reviews_count=7,
        ),
    ]
    db.add_all(products)
    db.commit()
    print("Seed completed: 2 categories and 2 products inserted.")


def main() -> None:
    db: Session = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
