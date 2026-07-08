"""add orders.receipt_snapshot for editable receipt

Revision ID: 20260708_0009
Revises: 20260621_0008
Create Date: 2026-07-08 12:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20260708_0009"
down_revision: Union[str, None] = "20260621_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(connection, table: str) -> set[str]:
    return {col["name"] for col in inspect(connection).get_columns(table)}


def upgrade() -> None:
    connection = op.get_bind()
    if "receipt_snapshot" not in _column_names(connection, "orders"):
        op.add_column("orders", sa.Column("receipt_snapshot", sa.JSON(), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()
    if "receipt_snapshot" in _column_names(connection, "orders"):
        op.drop_column("orders", "receipt_snapshot")
