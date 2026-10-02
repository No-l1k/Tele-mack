"""shared spec hints for product characteristics

Revision ID: 20261002_0010
Revises: 20260708_0009
Create Date: 2026-10-02 18:20:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "20261002_0010"
down_revision: Union[str, None] = "20260708_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_names(connection) -> set[str]:
    return set(inspect(connection).get_table_names())


def upgrade() -> None:
    connection = op.get_bind()
    if "spec_hints" not in _table_names(connection):
        op.create_table(
            "spec_hints",
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("hint", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("name"),
        )


def downgrade() -> None:
    connection = op.get_bind()
    if "spec_hints" in _table_names(connection):
        op.drop_table("spec_hints")
