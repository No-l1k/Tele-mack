"""add product/category/order columns (sync with ORM models)

Revision ID: 20260510_0004
Revises: 20260508_0003
Create Date: 2026-05-10 12:00:00

Колонки, которые ранее подмешивались только через ensure_* на SQLite.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "20260510_0004"
down_revision: Union[str, None] = "20260508_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(connection, table: str) -> set[str]:
    return {c["name"] for c in inspect(connection).get_columns(table)}


def upgrade() -> None:
    connection = op.get_bind()

    p = _column_names(connection, "products")
    if "sku" not in p:
        op.add_column("products", sa.Column("sku", sa.String(length=100), nullable=True))
    if "gtin" not in p:
        op.add_column("products", sa.Column("gtin", sa.String(length=32), nullable=True))
    if "stock_status" not in p:
        op.add_column(
            "products",
            sa.Column("stock_status", sa.String(length=20), server_default="in_stock", nullable=False),
        )
    if "rating_mode" not in p:
        op.add_column(
            "products",
            sa.Column("rating_mode", sa.String(length=20), server_default="manual", nullable=False),
        )
    if "warranty_months" not in p:
        op.add_column("products", sa.Column("warranty_months", sa.Integer(), nullable=True))
    if "warranty_type" not in p:
        op.add_column("products", sa.Column("warranty_type", sa.String(length=100), nullable=True))
    if "service_info" not in p:
        op.add_column("products", sa.Column("service_info", sa.Text(), nullable=True))
    if "meta_title" not in p:
        op.add_column("products", sa.Column("meta_title", sa.String(length=255), nullable=True))
    if "meta_description" not in p:
        op.add_column("products", sa.Column("meta_description", sa.String(length=500), nullable=True))

    c = _column_names(connection, "categories")
    if "show_on_home" not in c:
        op.add_column(
            "categories",
            sa.Column("show_on_home", sa.Boolean(), server_default=sa.false(), nullable=False),
        )

    o = _column_names(connection, "orders")
    if "selected_services" not in o:
        op.add_column("orders", sa.Column("selected_services", sa.JSON(), nullable=True))
    if "services_total" not in o:
        op.add_column(
            "orders",
            sa.Column("services_total", sa.Integer(), server_default="0", nullable=False),
        )


def downgrade() -> None:
    connection = op.get_bind()

    o = _column_names(connection, "orders")
    if "services_total" in o:
        op.drop_column("orders", "services_total")
    if "selected_services" in o:
        op.drop_column("orders", "selected_services")

    c = _column_names(connection, "categories")
    if "show_on_home" in c:
        op.drop_column("categories", "show_on_home")

    p = _column_names(connection, "products")
    for col in (
        "meta_description",
        "meta_title",
        "service_info",
        "warranty_type",
        "warranty_months",
        "rating_mode",
        "stock_status",
        "gtin",
        "sku",
    ):
        if col in p:
            op.drop_column("products", col)
