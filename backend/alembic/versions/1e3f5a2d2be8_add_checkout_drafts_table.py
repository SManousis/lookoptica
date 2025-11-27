"""add checkout drafts table

Revision ID: 1e3f5a2d2be8
Revises: a19da8a2a801
Create Date: 2025-11-26 08:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "1e3f5a2d2be8"
down_revision: Union[str, Sequence[str], None] = "a19da8a2a801"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()
    if "checkout_drafts" not in tables:
        op.create_table(
            "checkout_drafts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("token", sa.String(length=64), nullable=False),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
            sa.Column("guest_email", sa.String(length=255), nullable=True),
            sa.Column("shipping_data", sa.JSON(), nullable=True),
            sa.Column("invoice_data", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )
        op.create_index("ix_checkout_drafts_token", "checkout_drafts", ["token"], unique=True)
        op.create_index("ix_checkout_drafts_customer_id", "checkout_drafts", ["customer_id"])


def downgrade() -> None:
    op.drop_index("ix_checkout_drafts_customer_id", table_name="checkout_drafts")
    op.drop_index("ix_checkout_drafts_token", table_name="checkout_drafts")
    op.drop_table("checkout_drafts")
