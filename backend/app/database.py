from sqlalchemy import create_engine, text, update
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


is_sqlite = settings.database_url.startswith("sqlite")
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_product_columns() -> None:
    # Lightweight SQLite migration for newly introduced product fields.
    if not is_sqlite:
        return

    with engine.begin() as connection:
        rows = connection.execute(text("PRAGMA table_info(products)")).fetchall()
        existing = {row[1] for row in rows}

        column_ddl = {
            "sku": "ALTER TABLE products ADD COLUMN sku VARCHAR(100)",
            "gtin": "ALTER TABLE products ADD COLUMN gtin VARCHAR(32)",
            "stock_status": "ALTER TABLE products ADD COLUMN stock_status VARCHAR(20) DEFAULT 'in_stock'",
            "rating_mode": "ALTER TABLE products ADD COLUMN rating_mode VARCHAR(20) DEFAULT 'manual'",
            "warranty_months": "ALTER TABLE products ADD COLUMN warranty_months INTEGER",
            "warranty_type": "ALTER TABLE products ADD COLUMN warranty_type VARCHAR(100)",
            "service_info": "ALTER TABLE products ADD COLUMN service_info TEXT",
            "recommended_accessory_ids": "ALTER TABLE products ADD COLUMN recommended_accessory_ids JSON",
            "meta_title": "ALTER TABLE products ADD COLUMN meta_title VARCHAR(255)",
            "meta_description": "ALTER TABLE products ADD COLUMN meta_description VARCHAR(500)",
        }

        for column, ddl in column_ddl.items():
            if column not in existing:
                connection.execute(text(ddl))


def ensure_category_columns() -> None:
    # Lightweight SQLite migration for newly introduced category fields.
    if not is_sqlite:
        return

    with engine.begin() as connection:
        rows = connection.execute(text("PRAGMA table_info(categories)")).fetchall()
        existing = {row[1] for row in rows}

        column_ddl = {
            "show_on_home": "ALTER TABLE categories ADD COLUMN show_on_home BOOLEAN DEFAULT 0",
        }

        for column, ddl in column_ddl.items():
            if column not in existing:
                connection.execute(text(ddl))


def ensure_order_item_columns() -> None:
    """Добавляет колонку артикула в позициях заказа (SQLite)."""
    if not is_sqlite:
        return

    with engine.begin() as connection:
        rows = connection.execute(text("PRAGMA table_info(order_items)")).fetchall()
        existing = {row[1] for row in rows}

        if "product_sku" not in existing:
            connection.execute(text("ALTER TABLE order_items ADD COLUMN product_sku VARCHAR(100)"))


def ensure_order_columns() -> None:
    # Lightweight SQLite migration for newly introduced order fields.
    if not is_sqlite:
        return

    with engine.begin() as connection:
        rows = connection.execute(text("PRAGMA table_info(orders)")).fetchall()
        existing = {row[1] for row in rows}

        column_ddl = {
            "selected_services": "ALTER TABLE orders ADD COLUMN selected_services JSON",
            "services_total": "ALTER TABLE orders ADD COLUMN services_total INTEGER DEFAULT 0",
        }

        for column, ddl in column_ddl.items():
            if column not in existing:
                connection.execute(text(ddl))


def ensure_product_stock_flags_synced() -> None:
    """Синхронизирует in_stock со stock_status после смены логики остатков."""
    from .models import Product

    purchasable = ("in_stock", "low_stock")
    with engine.begin() as connection:
        connection.execute(
            update(Product)
            .where(Product.stock_status.in_(purchasable))
            .where(Product.in_stock.is_(False))
            .values(in_stock=True)
        )
        connection.execute(
            update(Product)
            .where(Product.stock_status.notin_(purchasable))
            .where(Product.in_stock.is_(True))
            .values(in_stock=False)
        )

