"""add orders and customer_addresses

Revision ID: a19da8a2a801
Revises: 4ff41561e8cf
Create Date: 2025-11-25 18:13:17.561230

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a19da8a2a801"
down_revision: Union[str, Sequence[str], None] = "4ff41561e8cf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # customer_addresses
    op.create_table(
        "customer_addresses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=50), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("address_line1", sa.String(length=255), nullable=False),
        sa.Column("address_line2", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("postcode", sa.String(length=20), nullable=False),
        sa.Column("region", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=False, server_default="Greece"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_customer_addresses_customer_id", "customer_addresses", ["customer_id"])

    # orders
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id"), nullable=True),
        sa.Column("guest_email", sa.String(length=255), nullable=True),

        sa.Column("status", sa.String(length=50), nullable=False, server_default="draft"),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="EUR"),

        # shipping
        sa.Column("shipping_full_name", sa.String(length=255), nullable=False),
        sa.Column("shipping_phone", sa.String(length=30), nullable=False),
        sa.Column("shipping_address_line1", sa.String(length=255), nullable=False),
        sa.Column("shipping_address_line2", sa.String(length=255), nullable=True),
        sa.Column("shipping_city", sa.String(length=100), nullable=False),
        sa.Column("shipping_postcode", sa.String(length=20), nullable=False),
        sa.Column("shipping_region", sa.String(length=100), nullable=True),
        sa.Column("shipping_country", sa.String(length=100), nullable=False, server_default="Greece"),
        sa.Column("shipping_notes", sa.Text(), nullable=True),

        # invoice
        sa.Column("wants_invoice", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("invoice_type", sa.String(length=30), nullable=True),
        sa.Column("invoice_company_name", sa.String(length=255), nullable=True),
        sa.Column("invoice_vat_number", sa.String(length=20), nullable=True),
        sa.Column("invoice_tax_office", sa.String(length=100), nullable=True),
        sa.Column("invoice_profession", sa.String(length=255), nullable=True),
        sa.Column("invoice_address_line1", sa.String(length=255), nullable=True),
        sa.Column("invoice_address_line2", sa.String(length=255), nullable=True),
        sa.Column("invoice_city", sa.String(length=100), nullable=True),
        sa.Column("invoice_postcode", sa.String(length=20), nullable=True),
        sa.Column("invoice_region", sa.String(length=100), nullable=True),

        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])


def downgrade() -> None:
    op.drop_index("ix_orders_customer_id", table_name="orders")
    op.drop_table("orders")
    op.drop_index("ix_customer_addresses_customer_id", table_name="customer_addresses")
    op.drop_table("customer_addresses")
