from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Order
from app.services.order_numbers import ORDER_NUMBER_START, allocate_next_order_id, ensure_order_id_sequence


def test_allocate_first_order_is_6200():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        assert allocate_next_order_id(db) == ORDER_NUMBER_START
    finally:
        db.close()


def test_allocate_skips_to_start_when_max_is_low():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        db.add(
            Order(
                id=42,
                total=1000,
                customer_name="Test",
                customer_phone="+79990000000",
            )
        )
        db.commit()
        assert allocate_next_order_id(db) == ORDER_NUMBER_START
    finally:
        db.close()


def test_allocate_continues_above_start():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        db.add(
            Order(
                id=6205,
                total=1000,
                customer_name="Test",
                customer_phone="+79990000000",
            )
        )
        db.commit()
        assert allocate_next_order_id(db) == 6206
    finally:
        db.close()


def test_ensure_order_id_sequence_does_not_break_empty_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    ensure_order_id_sequence(engine, is_sqlite=True)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        assert allocate_next_order_id(db) == ORDER_NUMBER_START
    finally:
        db.close()
