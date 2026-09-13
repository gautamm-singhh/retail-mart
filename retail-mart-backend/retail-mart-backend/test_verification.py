"""
Comprehensive verification test script for Retail Mart Mentor Requirements.
Runs against the running backend server on http://127.0.0.1:4000.
"""
import sys
import json
import urllib.request
import urllib.parse
import urllib.error

BASE_URL = "http://127.0.0.1:4000/api"

def make_req(path, method="GET", body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            content = resp.read().decode("utf-8")
            return status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {"error": str(e)}

def test_all():
    print("=== STARTING COMPREHENSIVE VERIFICATION TESTS ===")
    
    # 1. Health check
    status, data = make_req("/health")
    assert status == 200, f"Health check failed: {status}"
    print("[PASS] 1. Health check OK")

    # 2. Authenticate as Admin
    status, login_res = make_req("/auth/login", method="POST", body={
        "email": "gautam@retailmart.dev",
        "password": "password123"
    })
    assert status == 200, f"Admin login failed: {status}, {login_res}"
    admin_token = login_res.get("accessToken") or login_res.get("token")
    print(f"[PASS] 2. Admin Login OK (Role: {login_res['user']['role']})")

    # 3. Authenticate as Customer
    status, cust_res = make_req("/auth/login", method="POST", body={
        "email": "ananya.rao@example.com",
        "password": "password123"
    })
    assert status == 200, f"Customer login failed: {status}, {cust_res}"
    cust_token = cust_res.get("accessToken") or cust_res.get("token")
    print(f"[PASS] 3. Customer Login OK (User: {cust_res['user']['email']})")

    # 4. Customer Purchase Statistics & Appreciation
    status, stats_res = make_req("/customer/stats/summary", token=cust_token)
    assert status == 200, f"Customer stats failed: {status}, {stats_res}"
    print(f"Customer Stats: TotalSpent={stats_res.get('totalSpent')}, Orders={stats_res.get('totalOrders')}, TotalItemsPurchased={stats_res.get('totalItemsPurchased')}, UniqueProductsPurchased={stats_res.get('uniqueProductsPurchased')}")
    assert "uniqueProductsPurchased" in stats_res, "uniqueProductsPurchased missing in stats"
    assert "totalItemsPurchased" in stats_res, "totalItemsPurchased missing in stats"
    print("[PASS] 4. Customer Purchase Statistics & Item count for appreciation OK")

    # 5. Couriers List (Admin)
    status, couriers_res = make_req("/couriers", token=admin_token)
    assert status == 200, f"Couriers listing failed: {status}"
    print(f"Found {len(couriers_res)} couriers in database.")
    courier_codes = [c["code"] for c in couriers_res]
    print(f"Couriers registered: {courier_codes}")
    assert len(couriers_res) >= 4, "Expected at least 4 registered couriers"
    print("[PASS] 5. Registered Couriers retrieved OK")

    # 6. Courier Management CRUD
    status, new_c = make_req("/couriers", method="POST", token=admin_token, body={
        "name": "Test Express",
        "code": "TESTEXP",
        "contactEmail": "test@express.com",
        "trackingUrlTemplate": "https://track.testexpress.com/{tracking_number}"
    })
    assert status == 201, f"Courier creation failed: {status}, {new_c}"
    test_cid = new_c["id"]
    print(f"[PASS] 6a. Courier created: {new_c['name']} (ID: {test_cid})")

    status, del_c = make_req(f"/couriers/{test_cid}", method="DELETE", token=admin_token)
    assert status in (200, 204), f"Courier deletion failed: {status}, {del_c}"
    print("[PASS] 6b. Courier deletion OK (204 No Content)")

    # 7. Shipments List & Tracking API
    status, shipments_res = make_req("/shipments", token=admin_token)
    assert status == 200, f"Shipments listing failed: {status}"
    assert len(shipments_res) > 0, "No shipments found"
    first_shipment = shipments_res[0]
    shipment_id = first_shipment["id"]
    print(f"Checking shipment {shipment_id} (Tracking: {first_shipment.get('trackingNumber')})")

    status, track_res = make_req(f"/shipments/{shipment_id}/track", token=admin_token)
    assert status == 200, f"Shipment tracking failed: {status}, {track_res}"
    ext_tracking = track_res.get("externalTracking", {})
    print(f"External tracking provider: {ext_tracking.get('provider')}, Checkpoints: {len(ext_tracking.get('checkpoints', []))}")
    assert "provider" in ext_tracking, "externalTracking missing provider"
    print("[PASS] 7. Courier Tracking API OK")

    # 8. Sync Tracking with carrier
    status, sync_res = make_req(f"/shipments/{shipment_id}/sync-tracking", method="POST", token=admin_token)
    assert status == 200, f"Sync tracking failed: {status}, {sync_res}"
    print(f"Sync result: updated={sync_res.get('updated')}, status={sync_res.get('shipment', {}).get('status')}")
    print("[PASS] 8. Tracking Sync OK")

    # 9. Reports Analytics Summary (Strict Data Protection & Aggregation)
    status, analytics_res = make_req("/reports/analytics-summary", token=admin_token)
    assert status == 200, f"Analytics summary failed: {status}, {analytics_res}"
    exec_totals = analytics_res.get("executiveTotals", {})
    print(f"Executive totals: Revenue={exec_totals.get('totalRevenue')}, Orders={exec_totals.get('totalOrders')}, Delivered={exec_totals.get('deliveredOrders')}")
    assert "executiveTotals" in analytics_res
    assert "categoryBreakdown" in analytics_res
    assert "orderStatusBreakdown" in analytics_res
    assert "paymentMethodBreakdown" in analytics_res
    assert "monthlyTrends" in analytics_res
    # Ensure no customer PII leaked in analytics summary
    serialized = json.dumps(analytics_res)
    assert "customer@retailmart.local" not in serialized, "Customer email leaked in analytics!"
    assert "password" not in serialized.lower(), "Password field leaked in analytics!"
    print("[PASS] 9. Reports Analytics Summary with strict aggregation OK")

    # 10. AI Projections Currency Check (Strictly INR / ₹, NEVER $)
    status, proj_res = make_req("/analytics/projections?period=monthly&periodsAhead=3", token=admin_token)
    assert status == 200, f"Projections failed: {status}, {proj_res}"
    print(f"Statistical projections: {len(proj_res.get('forecast', []))} points")
    
    status, ai_res = make_req("/analytics/ai-projections?period=monthly&periodsAhead=3", token=admin_token)
    assert status == 200, f"AI projections failed: {status}, {ai_res}"
    narrative = ai_res.get("narrative", "")
    safe_narrative = narrative.encode("ascii", "replace").decode("ascii")
    print(f"AI Projections Narrative preview: {safe_narrative[:120]}...")
    assert "$" not in narrative, "Dollar symbol '$' found in AI projection narrative! Must strictly use INR / ₹."
    assert "₹" in narrative or "INR" in narrative or "Rs" in narrative, "Expected INR / ₹ symbol in narrative"
    print("[PASS] 10. AI Projections Currency strictly INR / Rupee (zero '$' found)")

    # 11. Communications SMTP Status
    status, smtp_res = make_req("/communications/smtp-status", token=admin_token)
    assert status == 200, f"SMTP status failed: {status}, {smtp_res}"
    print(f"SMTP Diagnostics: Configured={smtp_res.get('configured')}, Host={smtp_res.get('host')}, Port={smtp_res.get('port')}, Connected={smtp_res.get('connected')}")
    print(f"Required env vars reported: {smtp_res.get('requiredEnvVars')}")
    assert "requiredEnvVars" in smtp_res, "requiredEnvVars missing"
    print("[PASS] 11. SMTP Status & Diagnostics endpoint OK")

    print("\n=== ALL 11 VERIFICATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_all()
