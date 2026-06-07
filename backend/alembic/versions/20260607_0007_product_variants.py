"""add product variant grouping fields

Revision ID: 20260607_0007
Revises: 20260520_0006
Create Date: 2026-06-07 16:25:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "20260607_0007"
down_revision: Union[str, None] = "20260520_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(connection, table: str) -> set[str]:
    return {c["name"] for c in inspect(connection).get_columns(table)}


def _index_names(connection, table: str) -> set[str]:
    return {i["name"] for i in inspect(connection).get_indexes(table)}


def upgrade() -> None:
    connection = op.get_bind()
    columns = _column_names(connection, "products")
    if "variant_group" not in columns:
        op.add_column("products", sa.Column("variant_group", sa.String(length=255), nullable=True))
    if "variant_name" not in columns:
        op.add_column("products", sa.Column("variant_name", sa.String(length=100), nullable=True))
    if "variant_value" not in columns:
        op.add_column("products", sa.Column("variant_value", sa.String(length=100), nullable=True))
    if "ix_products_variant_group" not in _index_names(connection, "products"):
        op.create_index("ix_products_variant_group", "products", ["variant_group"], unique=False)


def downgrade() -> None:
    connection = op.get_bind()
    columns = _column_names(connection, "products")
    if "ix_products_variant_group" in _index_names(connection, "products"):
        op.drop_index("ix_products_variant_group", table_name="products")
    if "variant_value" in columns:
        op.drop_column("products", "variant_value")
    if "variant_name" in columns:
        op.drop_column("products", "variant_name")
    if "variant_group" in columns:
        op.drop_column("products", "variant_group")
