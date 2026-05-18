"""add recommended_accessory_ids to products

Revision ID: 20260518_0005
Revises: 20260510_0004
Create Date: 2026-05-18 16:30:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "20260518_0005"
down_revision: Union[str, None] = "20260510_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(connection, table: str) -> set[str]:
    return {c["name"] for c in inspect(connection).get_columns(table)}


def upgrade() -> None:
    connection = op.get_bind()
    p = _column_names(connection, "products")
    if "recommended_accessory_ids" not in p:
        op.add_column("products", sa.Column("recommended_accessory_ids", sa.JSON(), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()
    p = _column_names(connection, "products")
    if "recommended_accessory_ids" in p:
        op.drop_column("products", "recommended_accessory_ids")
