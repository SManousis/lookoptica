from alembic import context
from sqlalchemy import create_engine
from sqlalchemy import pool

from app.db import Base
from app.config import settings
from app.models import Product, Brand, Category  # noqa: F401

# Alembic Config object. We won't rely on sqlalchemy.url inside alembic.ini anymore.
config = context.config

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.database_url  # read from FastAPI settings (uses .env)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Build our own engine using the same DB URL as the app
    connectable = create_engine(
        settings.database_url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
