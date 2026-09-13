"""
E2E Wishlist Customer Verification & Isolation Suite
Tests the complete flow requested by the user:
- Customer A login -> like Product X -> refresh -> Product X still liked -> open Wishlist -> Product X appears -> remove Product X -> Wishlist updates
- Customer B login -> open Wishlist -> verify must NOT see Customer A's Product X
- Non-authenticated requests safely rejected (no fake backend data)
- Unique constraint / idempotency prevents duplicate records
"""
import requests

BASE = "http://127.0.0.1:4000/api"

def run_test():
    print("==================================================================")
    print("STARTING E2E CUSTOMER WISHLIST & MULTI-TENANT ISOLATION SUITE")
    print("==================================================================")

    # 1. Non-authenticated security check
    unauth_get = requests.get(f"{BASE}/wishlist")
    assert unauth_get.status_code == 401, f"Expected 401 for unauthenticated GET, got {unauth_get.status_code}"
    unauth_post = requests.post(f"{BASE}/wishlist", json={"productId": "p-1002"})
    assert unauth_post.status_code == 401, f"Expected 401 for unauthenticated POST, got {unauth_post.status_code}"
    print("[PASS] 1. Unauthenticated requests strictly rejected with 401 (no fake/unauthorized backend data)")

    # 2. Customer A & B Authentication
    res_a = requests.post(f"{BASE}/auth/login", json={"email": "ananya.rao@example.com", "password": "password123"})
    assert res_a.status_code == 200, "Customer A login failed"
    token_a = res_a.json().get("accessToken") or res_a.json().get("token")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = requests.post(f"{BASE}/auth/login", json={"email": "priya.customer@example.com", "password": "password123"})
    if res_b.status_code != 200:
        # If not already seeded, create customer B
        res_b = requests.post(f"{BASE}/auth/signup", json={"name": "Priya Menon", "email": "priya.customer@example.com", "password": "password123"})
    assert res_b.status_code in (200, 201), "Customer B auth failed"
    token_b = res_b.json().get("accessToken") or res_b.json().get("token")
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print(f"[PASS] 2. Customer A ({res_a.json()['user']['email']}) and Customer B ({res_b.json()['user']['email']}) authenticated")

    # Get sample product
    products = requests.get(f"{BASE}/products").json()
    p_list = products if isinstance(products, list) else products.get("data", products.get("items", products.get("products")))
    p_x = p_list[0]
    p_y = p_list[1]
    print(f"[INFO] Using Product X: {p_x['id']} ({p_x['name']}) and Product Y: {p_y['id']} ({p_y['name']})")

    # Ensure clean baseline
    for item in requests.get(f"{BASE}/wishlist", headers=headers_a).json():
        requests.delete(f"{BASE}/wishlist/{item['productId']}", headers=headers_a)
    for item in requests.get(f"{BASE}/wishlist", headers=headers_b).json():
        requests.delete(f"{BASE}/wishlist/{item['productId']}", headers=headers_b)

    # 3. Customer A likes Product X
    add_res = requests.post(f"{BASE}/wishlist", json={"productId": p_x["id"]}, headers=headers_a)
    assert add_res.status_code in (200, 201), f"Add to wishlist failed: {add_res.text}"
    print(f"[PASS] 3. Customer A liked Product X: {p_x['name']}")

    # 4. Refresh: Re-query from MySQL backend (simulating page reload)
    refresh_a = requests.get(f"{BASE}/wishlist", headers=headers_a).json()
    assert len(refresh_a) == 1, f"Expected 1 item after refresh, got {len(refresh_a)}"
    assert refresh_a[0]["productId"] == p_x["id"], "Product X ID mismatch"
    assert refresh_a[0]["product"]["name"] == p_x["name"], "Product X details mismatch"
    print(f"[PASS] 4. Refresh verified: Product X is still liked and persisted in MySQL")

    # 5. Open Wishlist: Product X appears with full details
    assert "product" in refresh_a[0], "Product object missing from wishlist payload"
    assert refresh_a[0]["product"]["price"] == p_x["price"], "Price mismatch"
    print(f"[PASS] 5. Open Wishlist verified: Product X appears with complete product catalog metadata")

    # 6. Idempotent check: liking again does not create duplicate
    dup_res = requests.post(f"{BASE}/wishlist", json={"productId": p_x["id"]}, headers=headers_a)
    assert dup_res.status_code == 200, "Expected 200 for idempotent duplicate add"
    refresh_a_dup = requests.get(f"{BASE}/wishlist", headers=headers_a).json()
    assert len(refresh_a_dup) == 1, "Duplicate wishlist item created!"
    print(f"[PASS] 6. Idempotency and unique constraint (user_id + product_id) verified (0 duplicate items)")

    # 7. Customer B opens Wishlist: User isolation verified!
    wl_b = requests.get(f"{BASE}/wishlist", headers=headers_b).json()
    assert len(wl_b) == 0, f"USER ISOLATION BREACH! Customer B sees Customer A's wishlist: {wl_b}"
    print(f"[PASS] 7. Multi-tenant User Isolation verified: Customer B's wishlist is empty and CANNOT see Customer A's items")

    # 8. Customer B likes Product Y
    add_b = requests.post(f"{BASE}/wishlist", json={"productId": p_y["id"]}, headers=headers_b)
    assert add_b.status_code in (200, 201)
    wl_b_after = requests.get(f"{BASE}/wishlist", headers=headers_b).json()
    assert len(wl_b_after) == 1 and wl_b_after[0]["productId"] == p_y["id"]
    print(f"[PASS] 8. Customer B independent wishlist contains Product Y ({p_y['name']})")

    # Customer A's wishlist still only contains Product X
    wl_a_recheck = requests.get(f"{BASE}/wishlist", headers=headers_a).json()
    assert len(wl_a_recheck) == 1 and wl_a_recheck[0]["productId"] == p_x["id"]
    print(f"[PASS] 9. Customer A's wishlist remains isolated with Product X only")

    # 10. Customer A removes Product X
    del_res = requests.delete(f"{BASE}/wishlist/{p_x['id']}", headers=headers_a)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    wl_a_final = requests.get(f"{BASE}/wishlist", headers=headers_a).json()
    assert len(wl_a_final) == 0, "Wishlist did not update to empty after delete"
    print(f"[PASS] 10. Customer A removed Product X: Wishlist updated and is now empty")

    # Customer B's wishlist still intact
    wl_b_final = requests.get(f"{BASE}/wishlist", headers=headers_b).json()
    assert len(wl_b_final) == 1 and wl_b_final[0]["productId"] == p_y["id"]
    print(f"[PASS] 11. Customer B's wishlist is completely unaffected by Customer A's removal")

    # Cleanup Customer B
    requests.delete(f"{BASE}/wishlist/{p_y['id']}", headers=headers_b)
    print("\n==================================================================")
    print("ALL 11 E2E CUSTOMER WISHLIST & USER ISOLATION CHECKS PASSED!")
    print("==================================================================")

if __name__ == "__main__":
    run_test()
