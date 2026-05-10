"""order_items product_sku snapshot

Revision ID: 20260508_0003
Revises: 20260428_0002
Create Date: 2026-05-08 12:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260508_0003"
down_revision: Union[str, None] = "20260428_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("order_items", sa.Column("product_sku", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("order_items", "product_sku")
