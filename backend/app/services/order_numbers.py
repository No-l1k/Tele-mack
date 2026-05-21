"""Нумерация заказов: публичный номер совпадает с orders.id."""

from sqlalchemy import func, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

ORDER_NUMBER_START = 6200


def allocate_next_order_id(db: Session) -> int:
    """Следующий номер заказа: не ниже ORDER_NUMBER_START и больше текущего максимума."""
    from ..models import Order

    max_id = db.query(func.max(Order.id)).scalar()
    if max_id is None:
        max_id = 0
    return max(ORDER_NUMBER_START, int(max_id) + 1)


def ensure_order_id_sequence(engine: Engine, *, is_sqlite: bool) -> None:
    """
    Поднимает autoincrement в БД до max(ORDER_NUMBER_START - 1, MAX(id)),
    чтобы даже без явного id следующая вставка не дала номер < 6200.
    """
    seq = ORDER_NUMBER_START - 1
    with engine.begin() as connection:
        max_id = connection.execute(text("SELECT COALESCE(MAX(id), 0) FROM orders")).scalar()
        if max_id is not None:
            seq = max(seq, int(max_id))

        if is_sqlite:
            try:
                row = connection.execute(
                    text("SELECT seq FROM sqlite_sequence WHERE name = 'orders'")
                ).first()
            except Exception:
                return
            if row is None:
                connection.execute(
                    text("INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', :seq)"),
                    {"seq": seq},
                )
            elif int(row[0]) < seq:
                connection.execute(
                    text("UPDATE sqlite_sequence SET seq = :seq WHERE name = 'orders'"),
                    {"seq": seq},
                )
            return

        pg_seq = connection.execute(
            text("SELECT pg_get_serial_sequence('orders', 'id')")
        ).scalar()
        if not pg_seq:
            return
        connection.execute(
            text("SELECT setval(:seq_name, :seq_value, true)"),
            {"seq_name": pg_seq, "seq_value": seq},
        )
