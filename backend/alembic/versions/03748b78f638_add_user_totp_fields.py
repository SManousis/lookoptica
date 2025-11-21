"""add user totp fields

Revision ID: 03748b78f638
Revises: 65f24d80105e
Create Date: 2025-11-20 14:44:15.353054

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "03748b78f638"
down_revision: Union[str, Sequence[str], None] = "65f24d80105e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("totp_secret", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "is_totp_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("FALSE"),
        ),
    )
    op.execute("UPDATE users SET is_totp_enabled = FALSE WHERE is_totp_enabled IS NULL")
    op.alter_column(
        "users",
        "is_totp_enabled",
        server_default=None,
    )


def downgrade() -> None:
    op.drop_column("users", "is_totp_enabled")
    op.drop_column("users", "totp_secret")
