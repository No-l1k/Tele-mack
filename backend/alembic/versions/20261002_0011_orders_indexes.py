"""indexes on orders for list/filter/sort

Revision ID: 20261002_0011
Revises: 20261002_0010
Create Date: 2026-10-02 18:50:00
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

revision: str = "20261002_0011"
down_revision: Union[str, None] = "20261002_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_names(connection, table: str) -> set[str]:
    return {index["name"] for index in inspect(connection).get_indexes(table) if index.get("name")}


def upgrade() -> None:
    connection = op.get_bind()
    tables = set(inspect(connection).get_table_names())
    if "orders" not in tables:
        return
    names = _index_names(connection, "orders")
    if "ix_orders_user_id_created_at" not in names:
        op.create_index("ix_orders_user_id_created_at", "orders", ["user_id", "created_at"], unique=False)
    if "ix_orders_created_at" not in names:
        op.create_index("ix_orders_created_at", "orders", ["created_at"], unique=False)
    if "ix_orders_status" not in names:
        op.create_index("ix_orders_status", "orders", ["status"], unique=False)


def downgrade() -> None:
    connection = op.get_bind()
    tables = set(inspect(connection).get_table_names())
    if "orders" not in tables:
        return
    names = _index_names(connection, "orders")
    if "ix_orders_status" in names:
        op.drop_index("ix_orders_status", table_name="orders")
    if "ix_orders_created_at" in names:
        op.drop_index("ix_orders_created_at", table_name="orders")
    if "ix_orders_user_id_created_at" in names:
        op.drop_index("ix_orders_user_id_created_at", table_name="orders")
