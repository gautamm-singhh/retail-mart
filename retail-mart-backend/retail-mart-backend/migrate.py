"""
Database Migration / Schema Upgrade Script for Retail Mart.

Safely and idempotently applies missing schema migrations to the active database
(MySQL or SQLite) without dropping tables or losing existing data.

Specific migrations applied:
1. Creates `couriers` table if not present.
2. Adds `courier_id` (nullable VARCHAR(20) FK to `couriers.id`) to `shipments` if not present.
3. Adds foreign key constraint and index on `shipments(courier_id)`.
4. Idempotently registers initial default couriers (Bluedart, Delhivery, Ekart, DTDC)
   without duplicating any existing rows.
"""

from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from sqlalchemy import inspect, text


INITIAL_COURIERS = [
    {
        "id": "CUR-00001",
        "name": "Bluedart",
        "code": "BLUEDART",
        "contact_email": "support@bluedart.com",
        "tracking_url_template": "https://track.bluedart.com/?id={tracking_number}",
        "is_active": True,
    },
    {
        "id": "CUR-00002",
        "name": "Delhivery",
        "code": "DELHIVERY",
        "contact_email": "support@delhivery.com",
        "tracking_url_template": "https://www.delhivery.com/track/package/{tracking_number}",
        "is_active": True,
    },
    {
        "id": "CUR-00003",
        "name": "Ekart",
        "code": "EKART",
        "contact_email": "support@ekartlogistics.com",
        "tracking_url_template": "https://ekartlogistics.com/track/{tracking_number}",
        "is_active": True,
    },
    {
        "id": "CUR-00004",
        "name": "DTDC",
        "code": "DTDC",
        "contact_email": "support@dtdc.com",
        "tracking_url_template": "https://www.dtdc.in/tracking/tracking_results.asp?pin={tracking_number}",
        "is_active": True,
    },
]


def run_migration(app=None):
    if app is None:
        app = create_app()

    with app.app_context():
        engine = db.engine
        dialect = engine.dialect.name
        insp = inspect(engine)
        tables = set(insp.get_table_names())

        print(f"[*] Checking database schema (dialect: {dialect})...")

        # 1. Create `couriers` table if missing
        if "couriers" not in tables:
            print("[+] Creating 'couriers' table...")
            if dialect == "mysql":
                db.session.execute(
                    text(
                        """
                        CREATE TABLE couriers (
                            id VARCHAR(20) NOT NULL PRIMARY KEY,
                            name VARCHAR(120) NOT NULL UNIQUE,
                            code VARCHAR(40) NOT NULL UNIQUE,
                            contact_email VARCHAR(150) NULL,
                            tracking_url_template VARCHAR(500) NULL,
                            is_active TINYINT(1) NOT NULL DEFAULT 1,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
                        """
                    )
                )
            else:
                # SQLite fallback
                db.session.execute(
                    text(
                        """
                        CREATE TABLE couriers (
                            id VARCHAR(20) NOT NULL PRIMARY KEY,
                            name VARCHAR(120) NOT NULL UNIQUE,
                            code VARCHAR(40) NOT NULL UNIQUE,
                            contact_email VARCHAR(150) NULL,
                            tracking_url_template VARCHAR(500) NULL,
                            is_active BOOLEAN NOT NULL DEFAULT 1,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                        """
                    )
                )
            db.session.commit()
            print("[OK] 'couriers' table created successfully.")
        else:
            print("[-] 'couriers' table already exists.")

        # 1b. Create `wishlist_items` table if missing
        if "wishlist_items" not in tables:
            print("[+] Creating 'wishlist_items' table...")
            if dialect == "mysql":
                db.session.execute(
                    text(
                        """
                        CREATE TABLE wishlist_items (
                            id VARCHAR(36) NOT NULL PRIMARY KEY,
                            user_id VARCHAR(20) NOT NULL,
                            product_id VARCHAR(20) NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            INDEX idx_wishlist_user (user_id),
                            INDEX idx_wishlist_product (product_id),
                            UNIQUE KEY uq_user_product_wishlist (user_id, product_id),
                            CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                            CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
                        """
                    )
                )
            else:
                db.session.execute(
                    text(
                        """
                        CREATE TABLE wishlist_items (
                            id VARCHAR(36) NOT NULL PRIMARY KEY,
                            user_id VARCHAR(20) NOT NULL,
                            product_id VARCHAR(20) NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            UNIQUE (user_id, product_id),
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                        );
                        """
                    )
                )
            db.session.commit()
            print("[OK] 'wishlist_items' table created successfully.")
        else:
            print("[-] 'wishlist_items' table already exists.")

        # Re-inspect tables and columns
        insp = inspect(engine)
        shipment_cols = {c["name"] for c in insp.get_columns("shipments")}

        # 2. Add `courier_id` column to `shipments` if missing
        if "courier_id" not in shipment_cols:
            print("[+] Adding 'courier_id' column to 'shipments' table...")
            if dialect == "mysql":
                db.session.execute(
                    text(
                        """
                        ALTER TABLE shipments
                        ADD COLUMN courier_id VARCHAR(20) NULL AFTER order_id;
                        """
                    )
                )
            else:
                db.session.execute(
                    text(
                        """
                        ALTER TABLE shipments
                        ADD COLUMN courier_id VARCHAR(20) NULL;
                        """
                    )
                )
            db.session.commit()
            print("[OK] Added 'courier_id' column to 'shipments'.")
        else:
            print("[-] Column 'courier_id' already exists in 'shipments'.")

        # 3. Check foreign key constraint in MySQL
        if dialect == "mysql":
            # Check existing foreign keys on `shipments`
            fk_info = insp.get_foreign_keys("shipments")
            has_courier_fk = any(
                fk.get("referred_table") == "couriers" or "courier_id" in fk.get("constrained_columns", [])
                for fk in fk_info
            )
            if not has_courier_fk:
                print("[+] Adding foreign key constraint fk_shipments_courier_id...")
                try:
                    db.session.execute(
                        text(
                            """
                            ALTER TABLE shipments
                            ADD CONSTRAINT fk_shipments_courier_id
                            FOREIGN KEY (courier_id) REFERENCES couriers(id);
                            """
                        )
                    )
                    db.session.commit()
                    print("[OK] Foreign key fk_shipments_courier_id added.")
                except Exception as ex:
                    db.session.rollback()
                    print(f"[!] Note adding FK (may already exist): {ex}")
            else:
                print("[-] Foreign key constraint for 'courier_id' already exists.")

        # 4. Seed default couriers idempotently
        print("[*] Checking courier records...")
        from app.models.courier import Courier

        for c_data in INITIAL_COURIERS:
            existing = Courier.query.filter(
                (Courier.name == c_data["name"]) | (Courier.code == c_data["code"])
            ).first()
            if not existing:
                c = Courier(
                    id=c_data["id"],
                    name=c_data["name"],
                    code=c_data["code"],
                    contact_email=c_data["contact_email"],
                    tracking_url_template=c_data["tracking_url_template"],
                    is_active=c_data["is_active"],
                )
                db.session.add(c)
                print(f"[+] Registered default courier: {c_data['name']} ({c_data['code']})")
            else:
                print(f"[-] Courier {c_data['name']} ({c_data['code']}) already registered.")
        db.session.commit()

        print("[OK] Migration finished successfully.")


if __name__ == "__main__":
    run_migration()
