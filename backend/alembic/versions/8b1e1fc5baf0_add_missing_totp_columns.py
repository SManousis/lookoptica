"""add missing totp columns

Revision ID: 8b1e1fc5baf0
Revises: 03748b78f638
Create Date: 2025-11-20 16:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8b1e1fc5baf0"
down_revision: Union[str, Sequence[str], None] = "03748b78f638"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Only add columns if they are missing (safety patch for older DBs).
    op.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS "totp_secret" VARCHAR(32)')
    op.execute(
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS "is_totp_enabled" BOOLEAN DEFAULT FALSE NOT NULL'
    )
    op.execute("UPDATE users SET is_totp_enabled = FALSE WHERE is_totp_enabled IS NULL")
    op.alter_column("users", "is_totp_enabled", server_default=None)


def downgrade() -> None:
    # This revision only ensured the columns existed; nothing to remove explicitly.
    pass
