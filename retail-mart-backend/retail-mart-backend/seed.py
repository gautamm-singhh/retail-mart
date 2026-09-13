"""
Seeds the database with data that mirrors the Week-2 frontend's mock data
1:1 (src/features/*/data/*.ts), so pointing the React app at this API
produces the exact same screens it already renders from mocks.

Usage:
    python seed.py            # create tables + seed (skips if already seeded)
    python seed.py --reset    # drop all tables, recreate, then seed
"""

from dotenv import load_dotenv

load_dotenv()

import sys
from datetime import date

from app import create_app
from app.extensions import db
from app.models.user import Role, User
from app.models.catalog import Category, Product
from app.models.courier import Courier
from app.models.order import Order, OrderItem, OrderStatusEvent
from app.models.payment import Payment, PaymentStatusEvent
from app.models.shipment import Shipment, ShipmentStatusEvent
from app.models.campaign import Campaign
from app.models.address import Address


def d(s):
    return date.fromisoformat(s)


def seed():
    if User.query.first():
        print("Database already has data - skipping seed. Use --reset to start over.")
        return

    # --- Roles -----------------------------------------------------
    roles = {name: Role(role_name=name) for name in ("Admin", "Manager", "Staff", "Customer")}
    db.session.add_all(roles.values())
    db.session.flush()

    # --- Users (mirrors features/users/data/users.ts) ----------------
    users_data = [
        ("u-001", "Gautam Sharma", "gautam@retailmart.dev", "Admin", "active", "2025-11-01"),
        ("u-002", "Sorav Kapoor", "sorav@retailmart.dev", "Admin", "active", "2025-11-01"),
        ("u-003", "Neha Joshi", "neha.joshi@retailmart.dev", "Manager", "active", "2025-11-10"),
        ("u-004", "Rohit Desai", "rohit.desai@retailmart.dev", "Manager", "active", "2025-11-14"),
        ("u-005", "Farah Khan", "farah.khan@retailmart.dev", "Staff", "active", "2025-12-02"),
        ("u-006", "Aditya Nair", "aditya.nair@retailmart.dev", "Staff", "inactive", "2025-12-05"),
        ("u-007", "Ishita Bose", "ishita.bose@retailmart.dev", "Staff", "active", "2026-01-20"),
    ]
    for uid, name, email, role, status, created in users_data:
        u = User(id=uid, name=name, email=email, role_id=roles[role].role_id, status=status, created_at=d(created))
        u.set_password("password123")  # dev-only default password, see README
        db.session.add(u)

    # --- Categories (mirrors features/categories/data/categories.ts) ----
    categories_data = [
        ("c-01", "Apparel", "active", "2025-11-02"),
        ("c-02", "Footwear", "active", "2025-11-02"),
        ("c-03", "Electronics", "active", "2025-11-05"),
        ("c-04", "Home & Kitchen", "active", "2025-11-08"),
        ("c-05", "Sports & Fitness", "active", "2025-11-10"),
        ("c-06", "Accessories", "active", "2025-11-12"),
        ("c-07", "Seasonal Clearance", "inactive", "2025-06-20"),
    ]
    categories = {}
    for cid, name, status, created in categories_data:
        c = Category(id=cid, name=name, slug=name.lower().replace(" & ", "-").replace(" ", "-"), status=status, created_at=d(created))
        categories[name] = c
        db.session.add(c)

    # --- Products (mirrors features/products/data/products.ts) ---------
    products_data = [
        ("p-1001", "Cotton Crew T-Shirt", "APP-TSH-001", "Apparel", "Everyday crew neck t-shirt in 100% combed cotton.", 499, 240, "active"),
        ("p-1002", "Slim Fit Denim Jeans", "APP-JNS-014", "Apparel", "Mid-rise slim fit jeans with a slight stretch for comfort.", 1799, 58, "active"),
        ("p-1003", "Stainless Steel Water Bottle 1L", "HOM-BTL-022", "Home & Kitchen", "Double-wall insulated bottle, keeps drinks cold for 18 hours.", 349, 0, "out-of-stock"),
        ("p-1004", "Wireless Earbuds Pro", "ELE-EAR-009", "Electronics", "Bluetooth 5.3 earbuds with active noise cancellation.", 2999, 132, "active"),
        ("p-1005", "Non-Stick Frying Pan 26cm", "HOM-PAN-005", "Home & Kitchen", "Aluminium frying pan with a 3-layer non-stick coating.", 899, 76, "active"),
        ("p-1006", "Running Shoes - Trail", "FTW-RUN-031", "Footwear", "Grip-focused outsole built for uneven off-road terrain.", 2499, 12, "active"),
        ("p-1007", "Ceramic Coffee Mug Set (4pc)", "HOM-MUG-018", "Home & Kitchen", "Set of 4 dishwasher-safe ceramic mugs, 300ml each.", 649, 0, "out-of-stock"),
        ("p-1008", "Yoga Mat 6mm", "SPT-YOG-007", "Sports & Fitness", "Non-slip textured mat with a carry strap included.", 799, 94, "active"),
        ("p-1009", "Bluetooth Speaker Mini", "ELE-SPK-012", "Electronics", "Pocket-size speaker with 10 hours of battery life.", 1499, 45, "draft"),
        ("p-1010", "Leather Wallet - Bifold", "ACC-WAL-003", "Accessories", "Genuine leather bifold wallet with 6 card slots.", 999, 61, "active"),
    ]
    product_images = {
        "APP-TSH-001": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
        "APP-JNS-014": "https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80",
        "HOM-BTL-022": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
        "ELE-EAR-009": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
        "HOM-PAN-005": "https://images.unsplash.com/photo-1584990347449-399580436b76?w=600&auto=format&fit=crop&q=80",
        "FTW-RUN-031": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
        "HOM-MUG-018": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
        "SPT-YOG-007": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80",
        "ELE-SPK-012": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80",
        "ACC-WAL-003": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
    }
    for pid, name, sku, cat, desc, price, stock, status in products_data:
        image_url = product_images.get(sku, f"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80")
        db.session.add(
            Product(id=pid, name=name, sku=sku, category_id=categories[cat].id, description=desc, price=price, stock=stock, status=status, image_url=image_url)
        )

    # --- Orders (mirrors features/orders/data/orders.ts) ---------------
    orders_data = [
        ("ORD-58421", "Ananya Rao", "ananya.rao@example.com", "2026-08-14", 3298, "Paid", "Processing",
         [("Wireless Earbuds Pro", 1, 2999), ("Cotton Crew T-Shirt", 1, 299)],
         [("Pending", "2026-08-14"), ("Processing", "2026-08-15")]),
        ("ORD-58422", "Vikram Shah", "vikram.shah@example.com", "2026-08-14", 899, "Paid", "Shipped",
         [("Non-Stick Frying Pan 26cm", 1, 899)],
         [("Pending", "2026-08-14"), ("Processing", "2026-08-14"), ("Shipped", "2026-08-16")]),
        ("ORD-58423", "Priya Menon", "priya.menon@example.com", "2026-08-15", 5498, "Pending", "Pending",
         [("Wireless Earbuds Pro", 1, 2999), ("Running Shoes - Trail", 1, 2499)],
         [("Pending", "2026-08-15")]),
        ("ORD-58424", "Rahul Verma", "rahul.verma@example.com", "2026-08-15", 1499, "Paid", "Delivered",
         [("Bluetooth Speaker Mini", 1, 1499)],
         [("Pending", "2026-08-15"), ("Processing", "2026-08-15"), ("Shipped", "2026-08-16"), ("Delivered", "2026-08-17")]),
        ("ORD-58425", "Sneha Iyer", "sneha.iyer@example.com", "2026-08-16", 2499, "Failed", "Cancelled",
         [("Running Shoes - Trail", 1, 2499)],
         [("Pending", "2026-08-16"), ("Cancelled", "2026-08-16")]),
        ("ORD-58426", "Karan Malhotra", "karan.malhotra@example.com", "2026-08-16", 799, "Paid", "Delivered",
         [("Yoga Mat 6mm", 1, 799)],
         [("Pending", "2026-08-16"), ("Processing", "2026-08-16"), ("Shipped", "2026-08-16"), ("Delivered", "2026-08-16")]),
        ("ORD-58427", "Divya Nair", "divya.nair@example.com", "2026-08-17", 4198, "Paid", "Processing",
         [("Slim Fit Denim Jeans", 2, 1799), ("Ceramic Coffee Mug Set (4pc)", 1, 649)],
         [("Pending", "2026-08-17"), ("Processing", "2026-08-17")]),
        ("ORD-58428", "Arjun Kapoor", "arjun.kapoor@example.com", "2026-08-17", 649, "Refunded", "Cancelled",
         [("Ceramic Coffee Mug Set (4pc)", 1, 649)],
         [("Pending", "2026-08-17"), ("Cancelled", "2026-08-17")]),
    ]
    for oid, customer, email, odate, amount, pay_status, status, items, history in orders_data:
        order = Order(id=oid, customer=customer, customer_email=email, date=d(odate), amount=amount, payment_status=pay_status, status=status)
        for pname, qty, price in items:
            order.items.append(OrderItem(product_name=pname, quantity=qty, price=price))
        for st, dt in history:
            order.status_history.append(OrderStatusEvent(status=st, date=d(dt)))
        db.session.add(order)

    # --- Payments (mirrors features/payments/data/payments.ts) ---------
    payments_data = [
        ("PAY-90211", "ORD-58421", "Ananya Rao", 3298, "UPI", "Paid", "2026-08-14",
         [("Pending", "2026-08-14"), ("Paid", "2026-08-14")]),
        ("PAY-90212", "ORD-58422", "Vikram Shah", 899, "Card", "Paid", "2026-08-14",
         [("Pending", "2026-08-14"), ("Paid", "2026-08-14")]),
        ("PAY-90213", "ORD-58423", "Priya Menon", 5498, "Net Banking", "Pending", "2026-08-15",
         [("Pending", "2026-08-15")]),
        ("PAY-90214", "ORD-58424", "Rahul Verma", 1499, "Card", "Paid", "2026-08-15",
         [("Pending", "2026-08-15"), ("Paid", "2026-08-15")]),
        ("PAY-90215", "ORD-58425", "Sneha Iyer", 2499, "Card", "Failed", "2026-08-16",
         [("Pending", "2026-08-16"), ("Failed", "2026-08-16")]),
        ("PAY-90216", "ORD-58426", "Karan Malhotra", 799, "Cash on Delivery", "Paid", "2026-08-16",
         [("Paid", "2026-08-16")]),
        ("PAY-90217", "ORD-58427", "Divya Nair", 4198, "Wallet", "Paid", "2026-08-17",
         [("Pending", "2026-08-17"), ("Paid", "2026-08-17")]),
        ("PAY-90218", "ORD-58428", "Arjun Kapoor", 649, "UPI", "Refunded", "2026-08-17",
         [("Pending", "2026-08-17"), ("Paid", "2026-08-17"), ("Refunded", "2026-08-18")]),
    ]
    for pid, order_id, customer, amount, method, status, pdate, history in payments_data:
        payment = Payment(id=pid, order_id=order_id, customer=customer, amount=amount, method=method, status=status, date=d(pdate))
        for st, dt in history:
            payment.history.append(PaymentStatusEvent(status=st, date=d(dt)))
        db.session.add(payment)

    # --- Couriers (mirrors registered shipping partners) --------------
    couriers_data = [
        ("CUR-00001", "Bluedart", "BLUEDART", "support@bluedart.com", "https://track.bluedart.com/?id={tracking_number}", True),
        ("CUR-00002", "Delhivery", "DELHIVERY", "support@delhivery.com", "https://www.delhivery.com/track/package/{tracking_number}", True),
        ("CUR-00003", "Ekart", "EKART", "support@ekartlogistics.com", "https://ekartlogistics.com/track/{tracking_number}", True),
        ("CUR-00004", "DTDC", "DTDC", "support@dtdc.com", "https://www.dtdc.in/tracking/tracking_results.asp?pin={tracking_number}", True),
    ]
    courier_map = {}
    for cid, name, code, email, tmpl, active in couriers_data:
        c = Courier(id=cid, name=name, code=code, contact_email=email, tracking_url_template=tmpl, is_active=active)
        db.session.add(c)
        courier_map[name] = cid

    # --- Shipments (mirrors features/shipping/data/shipments.ts) -------
    shipments_data = [
        ("SHP-77001", "ORD-58422", "Vikram Shah", "Bluedart", "BD3391827", "Shipped", "2026-08-19",
         [("Pending", "2026-08-14"), ("Packed", "2026-08-15"), ("Shipped", "2026-08-16")]),
        ("SHP-77002", "ORD-58424", "Rahul Verma", "Delhivery", "DL8827311", "Delivered", "2026-08-17",
         [("Pending", "2026-08-15"), ("Packed", "2026-08-15"), ("Shipped", "2026-08-16"), ("Out for Delivery", "2026-08-17"), ("Delivered", "2026-08-17")]),
        ("SHP-77003", "ORD-58421", "Ananya Rao", "Ekart", "EK1120984", "Packed", "2026-08-20",
         [("Pending", "2026-08-14"), ("Packed", "2026-08-15")]),
        ("SHP-77004", "ORD-58426", "Karan Malhotra", "Delhivery", "DL8827455", "Delivered", "2026-08-16",
         [("Pending", "2026-08-16"), ("Packed", "2026-08-16"), ("Shipped", "2026-08-16"), ("Delivered", "2026-08-16")]),
        ("SHP-77005", "ORD-58427", "Divya Nair", "Bluedart", "BD3392015", "Out for Delivery", "2026-08-19",
         [("Pending", "2026-08-17"), ("Packed", "2026-08-17"), ("Shipped", "2026-08-18"), ("Out for Delivery", "2026-08-19")]),
        ("SHP-77006", "ORD-58423", "Priya Menon", "Ekart", "PENDING-ASSIGNMENT", "Pending", "2026-08-22",
         [("Pending", "2026-08-15")]),
    ]
    for sid, order_id, customer, courier, tracking, status, expected, history in shipments_data:
        shipment = Shipment(
            id=sid,
            order_id=order_id,
            courier_id=courier_map.get(courier),
            customer=customer,
            courier=courier,
            tracking_number=tracking,
            status=status,
            expected_delivery=d(expected),
        )
        for st, dt in history:
            shipment.tracking_history.append(ShipmentStatusEvent(status=st, date=d(dt)))
        db.session.add(shipment)

    # --- Campaigns (Week 3: Campaign Management) ------------------------
    campaigns_data = [
        ("CMP-90001", "Festive Season Sale", "FESTIVE25", "25% off sitewide for the festive season.",
         "percentage", 25, 999, "2026-08-01", "2026-09-15", "active"),
        ("CMP-90002", "New User Welcome", "WELCOME100", "Flat Rs. 100 off your first order.",
         "flat", 100, 499, "2026-01-01", None, "active"),
        ("CMP-90003", "Diwali Mega Sale", "DIWALI2026", "30% off electronics and apparel.",
         "percentage", 30, 1499, "2026-10-20", "2026-11-05", "scheduled"),
        ("CMP-90004", "Summer Clearance", "SUMMER20", "20% off select summer items.",
         "percentage", 20, None, "2026-04-01", "2026-06-30", "ended"),
    ]
    for cid, name, code, description, discount_type, discount_value, min_purchase, start, end, status in campaigns_data:
        db.session.add(
            Campaign(
                id=cid, name=name, code=code, description=description,
                discount_type=discount_type, discount_value=discount_value,
                min_purchase=min_purchase, start_date=d(start),
                end_date=d(end) if end else None, status=status,
            )
        )

    db.session.commit()
    print(f"Seeded {len(users_data)} users, {len(categories_data)} categories, {len(products_data)} products, "
          f"{len(orders_data)} orders, {len(payments_data)} payments, {len(shipments_data)} shipments, "
          f"{len(campaigns_data)} campaigns.")
    print("Default password for every seeded user: password123")

    # --- A sample storefront customer (Week 4: signup/OTP/customer dashboard) ---
    customer = User(
        id="u-101", name="Ananya Rao", email="ananya.rao@example.com", phone="+919876543210",
        role_id=roles["Customer"].role_id, status="active", created_at=d("2026-06-01"),
    )
    customer.set_password("password123")
    db.session.add(customer)
    db.session.flush()
    db.session.add(
        Address(
            id="ADDR-00001", user_id=customer.id, label="Home",
            line1="221B Residency Road", line2="Near City Mall", city="Bengaluru",
            state="Karnataka", postal_code="560025", phone="+919876543210", is_default=True,
        )
    )
    db.session.commit()
    print("Seeded 1 sample customer (ananya.rao@example.com / password123, phone +919876543210) with 1 address.")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        if "--reset" in sys.argv:
            db.drop_all()
            print("Dropped all tables.")
        db.create_all()
        seed()
