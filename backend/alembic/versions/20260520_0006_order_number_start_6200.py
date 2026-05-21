"""Следующие заказы получают номер не ниже 6200."""

from alembic import op
from sqlalchemy import text

revision = "20260520_0006"
down_revision = "20260518_0005"
branch_labels = None
depends_on = None

ORDER_NUMBER_START = 6200


def upgrade() -> None:
    bind = op.get_bind()
    max_id = bind.execute(text("SELECT COALESCE(MAX(id), 0) FROM orders")).scalar() or 0
    seq = max(ORDER_NUMBER_START - 1, int(max_id))

    if bind.dialect.name == "sqlite":
        try:
            row = bind.execute(
                text("SELECT seq FROM sqlite_sequence WHERE name = 'orders'")
            ).first()
        except Exception:
            return
        if row is None:
            bind.execute(
                text("INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', :seq)"),
                {"seq": seq},
            )
        elif int(row[0]) < seq:
            bind.execute(
                text("UPDATE sqlite_sequence SET seq = :seq WHERE name = 'orders'"),
                {"seq": seq},
            )
        return

    pg_seq = bind.execute(text("SELECT pg_get_serial_sequence('orders', 'id')")).scalar()
    if pg_seq:
        bind.execute(
            text("SELECT setval(:seq_name, :seq_value, true)"),
            {"seq_name": pg_seq, "seq_value": seq},
        )


def downgrade() -> None:
    pass
