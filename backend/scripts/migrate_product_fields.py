import sqlite3
from pathlib import Path


def main() -> None:
    backend_root = Path(__file__).resolve().parent.parent
    db_path = backend_root / "tele_makc.db"
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    existing = {row[1] for row in cur.execute("PRAGMA table_info(products)")}
    columns = {
        "sku": "ALTER TABLE products ADD COLUMN sku VARCHAR(100)",
        "gtin": "ALTER TABLE products ADD COLUMN gtin VARCHAR(32)",
        "stock_status": "ALTER TABLE products ADD COLUMN stock_status VARCHAR(20) DEFAULT 'in_stock'",
        "warranty_months": "ALTER TABLE products ADD COLUMN warranty_months INTEGER",
        "warranty_type": "ALTER TABLE products ADD COLUMN warranty_type VARCHAR(100)",
        "service_info": "ALTER TABLE products ADD COLUMN service_info VARCHAR(100)",
        "meta_title": "ALTER TABLE products ADD COLUMN meta_title VARCHAR(255)",
        "meta_description": "ALTER TABLE products ADD COLUMN meta_description VARCHAR(500)",
    }
    for name, ddl in columns.items():
        if name not in existing:
            cur.execute(ddl)
    cur.execute("UPDATE products SET stock_status = 'in_stock' WHERE stock_status IS NULL")
    conn.commit()
    print("Migration complete")
    conn.close()


if __name__ == "__main__":
    main()
