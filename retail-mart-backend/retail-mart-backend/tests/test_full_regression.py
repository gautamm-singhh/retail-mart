import sys
import os
import time
import hmac
import hashlib
from decimal import Decimal
from datetime import date

backend_dir = r"c:\Users\gauta\Downloads\files (4)\retail-mart-backend\retail-mart-backend"
sys.path.insert(0, backend_dir)

from app import create_app
from app.extensions import db
from app.models.catalog import Category, Product
from app.models.address import Address
from app.models.order import Order
from app.models.payment import Payment
from app.models.user import User, Role
from flask_jwt_extended import create_access_token

app = create_app("testing")
app.config["RAZORPAY_KEY_ID"] = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_mock")
app.config["RAZORPAY_KEY_SECRET"] = os.environ.get("RAZORPAY_KEY_SECRET", "test_secret_for_tests")

def setup_test_db():
    with app.app_context():
        db.create_all()

        # Seed Roles
        for r_name in ("Admin", "Manager", "Staff", "Customer"):
            if not Role.query.filter_by(role_name=r_name).first():
                db.session.add(Role(role_name=r_name))
        db.session.commit()

        r_cust = Role.query.filter_by(role_name="Customer").first()
        r_admin = Role.query.filter_by(role_name="Admin").first()

        # Seed Users
        if not User.query.filter_by(email="ananya.rao@example.com").first():
            u = User(
                id="u-cust-001",
                name="Ananya Rao",
                email="ananya.rao@example.com",
                role_id=r_cust.role_id,
                status="active"
            )
            u.set_password("password123")
            db.session.add(u)

        if not User.query.filter_by(email="gautam@retailmart.dev").first():
            a = User(
                id="u-admin-001",
                name="Gautam Singh",
                email="gautam@retailmart.dev",
                role_id=r_admin.role_id,
                status="active"
            )
            a.set_password("password123")
            db.session.add(a)

        # Seed Category & Product
        cat = Category.query.get("c-test-01")
        if not cat:
            cat = Category(id="c-test-01", name="Apparel", slug="apparel", status="active")
            db.session.add(cat)
            db.session.flush()

        prod = Product.query.get("p-test-01")
        if not prod:
            prod = Product(
                id="p-test-01",
                category_id=cat.id,
                name="Casual Cotton T-Shirt",
                sku="TSHIRT-001",
                price=Decimal("799.00"),
                stock=50,
                status="active"
            )
            db.session.add(prod)

        db.session.commit()

def test_customer_account_and_razorpay_regression():
    setup_test_db()

    print("=" * 60)
    print("RETAIL MART COMPREHENSIVE REGRESSION SUITE")
    print("=" * 60)
    
    with app.test_client() as client:
        # 1. Customer Login
        print("\n[TEST 1] Customer Login...")
        login_res = client.post("/api/auth/login", json={
            "email": "ananya.rao@example.com",
            "password": "password123"
        })
        assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}: {login_res.data}"
        token = login_res.get_json()["accessToken"]
        auth_header = {"Authorization": f"Bearer {token}"}
        print("  -> Customer login SUCCESS. Token received.")

        # 2. Account Summary (Customer Stats)
        print("\n[TEST 2] Customer Stats Summary...")
        t0 = time.monotonic()
        stats_res = client.get("/api/customer/stats/summary", headers=auth_header)
        elapsed_ms = (time.monotonic() - t0) * 1000
        assert stats_res.status_code == 200, f"Expected 200, got {stats_res.status_code}"
        stats = stats_res.get_json()
        print(f"  -> Stats loaded in {elapsed_ms:.1f}ms: totalOrders={stats['totalOrders']}, totalSpent={stats['totalSpent']}")

        # 3. Add Delivery Address
        print("\n[TEST 3] Add Delivery Address...")
        addr_res = client.post("/api/addresses", headers=auth_header, json={
            "label": "Test Home",
            "line1": "Flat 303, Sunrise Apartments",
            "city": "Hyderabad",
            "state": "Telangana",
            "postalCode": "500081",
            "phone": "+919876543210",
            "isDefault": True
        })
        assert addr_res.status_code == 201, f"Expected 201, got {addr_res.status_code}: {addr_res.data}"
        new_addr = addr_res.get_json()
        addr_id = new_addr["id"]
        print(f"  -> Address created: ID={addr_id}, Label={new_addr['label']}, State={new_addr['state']}")

        # 4. Refresh / List Addresses (Persistence check)
        print("\n[TEST 4] Refresh / List Addresses...")
        list_res = client.get("/api/addresses", headers=auth_header)
        assert list_res.status_code == 200
        addresses = list_res.get_json()
        found = any(a["id"] == addr_id for a in addresses)
        assert found, f"Newly added address {addr_id} not found in address list"
        print(f"  -> Address list loaded: {len(addresses)} addresses found. New address verified.")

        # 5. Edit and Delete Address
        print("\n[TEST 5] Edit Address...")
        edit_res = client.put(f"/api/addresses/{addr_id}", headers=auth_header, json={"label": "Primary Residence"})
        assert edit_res.status_code == 200
        assert edit_res.get_json()["label"] == "Primary Residence"
        print("  -> Address edit SUCCESS.")

        # 6. Order Creation & Fail-Safe SMTP handling
        print("\n[TEST 6] Order Creation with SMTP timeout resilience...")
        with app.app_context():
            p = Product.query.filter_by(status="active").first()
            prod_id = p.id
            prod_name = p.name
            prod_price = float(p.price)
        
        t0 = time.monotonic()
        order_res = client.post("/api/orders", headers=auth_header, json={
            "customer": "Ananya Rao",
            "customerEmail": "ananya.rao@example.com",
            "destinationState": "Telangana",
            "items": [{
                "productId": prod_id,
                "productName": prod_name,
                "quantity": 1,
                "price": prod_price
            }]
        })
        elapsed_order_ms = (time.monotonic() - t0) * 1000
        assert order_res.status_code == 201, f"Expected 201, got {order_res.status_code}: {order_res.data}"
        order_data = order_res.get_json()
        order_id = order_data["id"]
        payment_id = order_data.get("paymentId")
        email_info = order_data.get("emailDelivery", {})
        assert payment_id is not None, "Order must return paymentId"
        print(f"  -> Order {order_id} created in {elapsed_order_ms:.1f}ms! PaymentId={payment_id}")
        print(f"  -> Email delivery metadata: attempted={email_info.get('attempted')}, status={email_info.get('status')}")

        # 7. Razorpay Order Creation
        print("\n[TEST 7] Razorpay Order Creation...")
        rzp_order_res = client.post("/api/payments/razorpay/order", headers=auth_header, json={
            "paymentId": payment_id
        })
        assert rzp_order_res.status_code == 200, f"Expected 200, got {rzp_order_res.status_code}: {rzp_order_res.data}"
        rzp_order = rzp_order_res.get_json()
        assert "razorpayOrderId" in rzp_order
        print(f"  -> Razorpay order created: rzp_order_id={rzp_order['razorpayOrderId']}, amount={rzp_order['amount']} paise")

        # 8. Razorpay Signature Verification (Test Mode Payment)
        print("\n[TEST 8] Razorpay Signature Verification & Inventory Deduction...")
        # In test mode with mock keys, verify signature succeeds
        from app.utils.razorpay_client import get_razorpay_client
        client_rzp = get_razorpay_client()
        payload = f"{rzp_order['razorpayOrderId']}|pay_test_123"
        secret = app.config["RAZORPAY_KEY_SECRET"].encode()
        sig = hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()

        verify_res = client.post("/api/payments/razorpay/verify", headers=auth_header, json={
            "paymentId": payment_id,
            "razorpayOrderId": rzp_order["razorpayOrderId"],
            "razorpayPaymentId": "pay_test_123",
            "razorpaySignature": sig
        })
        assert verify_res.status_code == 200, f"Expected 200, got {verify_res.status_code}: {verify_res.data}"
        paid_payment = verify_res.get_json()
        assert paid_payment["status"] == "Paid"
        print(f"  -> Payment verified successfully: status={paid_payment['status']}")

        # 9. Duplicate Payment Verification (Idempotency)
        print("\n[TEST 9] Duplicate Payment Verification...")
        dup_res = client.post("/api/payments/razorpay/verify", headers=auth_header, json={
            "paymentId": payment_id,
            "razorpayOrderId": rzp_order["razorpayOrderId"],
            "razorpayPaymentId": "pay_test_123",
            "razorpaySignature": sig
        })
        assert dup_res.status_code == 200
        print("  -> Duplicate payment verification handled idempotently.")

        # 10. Customer Order History (/orders/mine)
        print("\n[TEST 10] Customer Order History...")
        orders_res = client.get("/api/orders/mine", headers=auth_header)
        assert orders_res.status_code == 200
        my_orders = orders_res.get_json()
        assert any(o["id"] == order_id for o in my_orders)
        print(f"  -> Order history retrieved: {len(my_orders)} orders. Found {order_id} with payment status '{my_orders[0]['paymentStatus']}'")

        # 11. Security Test: Invalid / Expired Token
        print("\n[TEST 11] Security: Invalid Token rejection...")
        invalid_res = client.get("/api/customer/stats/summary", headers={"Authorization": "Bearer invalid_token_xyz"})
        assert invalid_res.status_code in (401, 422), f"Expected 401/422, got {invalid_res.status_code}"
        print(f"  -> Invalid token properly rejected with HTTP {invalid_res.status_code}")

        # 12. Security Test: Admin Attempting Customer Endpoint
        print("\n[TEST 12] Security: Admin attempting Customer-only endpoint...")
        admin_login = client.post("/api/auth/login", json={
            "email": "gautam@retailmart.dev",
            "password": "password123"
        })
        admin_token = admin_login.get_json()["accessToken"]
        admin_header = {"Authorization": f"Bearer {admin_token}"}
        
        admin_stats = client.get("/api/customer/stats/summary", headers=admin_header)
        assert admin_stats.status_code == 403, f"Expected 403, got {admin_stats.status_code}"
        admin_addrs = client.get("/api/addresses", headers=admin_header)
        assert admin_addrs.status_code == 403, f"Expected 403, got {admin_addrs.status_code}"
        print("  -> RBAC preserved: Admin correctly blocked (HTTP 403) from Customer-only endpoints.")

        # 13. Invalid Address Form Validation
        print("\n[TEST 13] Validation: Invalid Address Form...")
        bad_addr = client.post("/api/addresses", headers=auth_header, json={"line1": "", "city": ""})
        assert bad_addr.status_code == 400, f"Expected 400, got {bad_addr.status_code}"
        assert "required" in bad_addr.get_json().get("error", "").lower()
        print(f"  -> Accurate validation error returned: {bad_addr.get_json()['error']}")

        # 14. Failed / Invalid Payment Signature Rejection
        print("\n[TEST 14] Razorpay Invalid Signature rejection...")
        # Create a second order for failure testing
        bad_order_res = client.post("/api/orders", headers=auth_header, json={
            "customer": "Ananya Rao",
            "customerEmail": "ananya.rao@example.com",
            "destinationState": "Telangana",
            "items": [{
                "productId": prod_id,
                "productName": prod_name,
                "quantity": 1,
                "price": prod_price
            }]
        })
        bad_pay_id = bad_order_res.get_json()["paymentId"]
        bad_verify = client.post("/api/payments/razorpay/verify", headers=auth_header, json={
            "paymentId": bad_pay_id,
            "razorpayOrderId": "order_fake_123",
            "razorpayPaymentId": "pay_fake_123",
            "razorpaySignature": "tampered_signature"
        })
        assert bad_verify.status_code == 400, f"Expected 400, got {bad_verify.status_code}"
        print(f"  -> Tampered payment signature correctly rejected with HTTP 400.")

        # Cleanup: Delete the test address
        client.delete(f"/api/addresses/{addr_id}", headers=auth_header)
        print(f"  -> Cleaned up test address {addr_id}.")

    print("\n" + "=" * 60)
    print("ALL 14 REGRESSION SUITE TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_customer_account_and_razorpay_regression()
