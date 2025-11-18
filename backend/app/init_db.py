# app/init_db.py
from app.db import engine, Base

# Import all models so they are registered with Base
from app.models import user  # noqa: F401
from app.models import product  # if you have it
# from app.models import whatever_else  # add others if needed

def init_db():
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")

if __name__ == "__main__":
    init_db()
