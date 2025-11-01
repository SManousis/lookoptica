# seed.py
from sqlalchemy import text
from app.db import SessionLocal

def main():
    db = SessionLocal()
    try:
        # --- Insert Brand ---
        db.execute(text("""
            INSERT INTO brands (id, name, slug)
            VALUES (1, 'Fasma', 'fasma')
            ON CONFLICT (id) DO NOTHING;
        """))

        # --- Insert Categories ---
        db.execute(text("""
            INSERT INTO categories (id, title, slug)
            VALUES
              (1, 'Ophthalmic Frames', 'ophthalmic-frames'),
              (2, 'Sunglasses', 'sunglasses')
            ON CONFLICT (id) DO NOTHING;
        """))

        # --- Insert Products ---
        db.execute(text("""
            INSERT INTO products (
                id, sku, ean, slug,
                title_el, title_en,
                brand_id, category_id,
                price, stock,
                status, visible, version
            ) VALUES
              (1001, 'FAS-001', '5200000000001', 'fasma-001',
               'Fasma 001', 'Fasma 001', 1, 1,
               89.00, 10, 'published', TRUE, 1),
              (1002, 'FAS-002', '5200000000002', 'fasma-002',
               'Fasma 002', 'Fasma 002', 1, 2,
               119.00, 5, 'published', TRUE, 1),
              (1003, 'FAS-003', '5200000000003', 'fasma-003',
               'Fasma 003', 'Fasma 003', 1, 1,
               149.00, 0, 'draft', TRUE, 1)
            ON CONFLICT (id) DO NOTHING;
        """))

        db.commit()
        print("✅ Seed complete.")
    except Exception as e:
        print("❌ Seed failed:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
