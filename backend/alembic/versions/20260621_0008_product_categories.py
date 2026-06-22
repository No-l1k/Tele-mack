"""add product_categories many-to-many table

Revision ID: 20260621_0008
Revises: 20260607_0007
Create Date: 2026-06-21 12:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "20260621_0008"
down_revision: Union[str, None] = "20260607_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_names(connection) -> set[str]:
    return set(inspect(connection).get_table_names())


def upgrade() -> None:
    connection = op.get_bind()
    if "product_categories" not in _table_names(connection):
        op.create_table(
            "product_categories",
            sa.Column("product_id", sa.Integer(), nullable=False),
            sa.Column("category_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("product_id", "category_id"),
        )
        op.create_index("ix_product_categories_category_id", "product_categories", ["category_id"], unique=False)

    connection.execute(
        sa.text(
            """
            INSERT INTO product_categories (product_id, category_id)
            SELECT p.id, p.category_id
            FROM products p
            WHERE p.category_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM product_categories pc
                WHERE pc.product_id = p.id AND pc.category_id = p.category_id
              )
            """
        )
    )


def downgrade() -> None:
    connection = op.get_bind()
    if "product_categories" in _table_names(connection):
        if "ix_product_categories_category_id" in {i["name"] for i in inspect(connection).get_indexes("product_categories")}:
            op.drop_index("ix_product_categories_category_id", table_name="product_categories")
        op.drop_table("product_categories")
