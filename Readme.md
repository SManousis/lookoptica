In the backend. First start venv: source .venv/Scripts/activate
Then: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

In the fronted: npm run dev


For db reset :
    BEGIN;
    TRUNCATE TABLE products RESTART IDENTITY CASCADE;
    TRUNCATE TABLE brands RESTART IDENTITY CASCADE;
    TRUNCATE TABLE categories RESTART IDENTITY CASCADE;
    COMMIT;

Then from the website folder:
    python backend/scripts/import_wp_dump.py backend/to/u554181877_qSob8.sql.gz
