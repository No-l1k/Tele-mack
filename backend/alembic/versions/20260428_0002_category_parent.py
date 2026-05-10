"""add category parent_id

Revision ID: 20260428_0002
Revises: 20260424_0001
Create Date: 2026-04-28 17:40:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260428_0002"
down_revision: Union[str, None] = "20260424_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("parent_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_categories_parent_id"), "categories", ["parent_id"], unique=False)
    op.create_foreign_key("fk_categories_parent_id", "categories", "categories", ["parent_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_categories_parent_id", "categories", type_="foreignkey")
    op.drop_index(op.f("ix_categories_parent_id"), table_name="categories")
    op.drop_column("categories", "parent_id")
