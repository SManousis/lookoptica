"""Initial schema with core catalog and auth tables.

Revision ID: 7a7d95b943a5
Revises:
Create Date: 2025-11-10 14:11:10.215751

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "7a7d95b943a5"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Users & Roles ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=50), nullable=False, unique=True),
        sa.Column("description", sa.String(length=255), nullable=True),
    )

    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )

    # --- Customers ---
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("marketing_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("FALSE")),
    )
    op.create_index("ix_customers_email", "customers", ["email"], unique=True)

    op.create_table(
        "customer_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
    )
    op.create_index("ix_customer_sessions_customer_id", "customer_sessions", ["customer_id"])

    # --- Catalog ---
    op.create_table(
        "brands",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False, unique=True),
    )

    op.create_table(
        "categories",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False, unique=True),
        sa.Column("parent_id", sa.BigInteger(), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("sku", sa.Text(), nullable=False, unique=True),
        sa.Column("ean", sa.Text(), nullable=True),
        sa.Column("slug", sa.Text(), nullable=True),
        sa.Column("title_el", sa.Text(), nullable=False),
        sa.Column("title_en", sa.Text(), nullable=False),
        sa.Column("brand_id", sa.BigInteger(), sa.ForeignKey("brands.id"), nullable=True),
        sa.Column("category_id", sa.BigInteger(), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("images", JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("compare_at_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("attributes", JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("stock", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'draft'::text")),
        sa.Column("visible", sa.Boolean(), nullable=False, server_default=sa.text("TRUE")),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_products_slug", "products", ["slug"])


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_products_slug")
    op.execute("DROP TABLE IF EXISTS products CASCADE")
    op.execute("DROP TABLE IF EXISTS categories CASCADE")
    op.execute("DROP TABLE IF EXISTS brands CASCADE")
    op.execute("DROP INDEX IF EXISTS ix_customer_sessions_customer_id")
    op.execute("DROP TABLE IF EXISTS customer_sessions CASCADE")
    op.execute("DROP INDEX IF EXISTS ix_customers_email")
    op.execute("DROP TABLE IF EXISTS customers CASCADE")
    op.execute("DROP TABLE IF EXISTS user_roles CASCADE")
    op.execute("DROP TABLE IF EXISTS roles CASCADE")
    op.execute("DROP INDEX IF EXISTS ix_users_email")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
