# create_tables.py
from app.db import Base, engine
from app import db
from app.models import product  # make sure Product model is imported so it's registered

def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")

if __name__ == "__main__":
    main()
