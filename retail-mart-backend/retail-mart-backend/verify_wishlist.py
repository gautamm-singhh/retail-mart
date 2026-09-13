import requests

BASE = 'http://127.0.0.1:4000/api'

def get_or_create_customer(email, password, name):
    res = requests.post(f'{BASE}/auth/login', json={'email': email, 'password': password})
    if res.status_code == 200:
        token = res.json().get('accessToken') or res.json().get('token')
        return token, res.json().get('user')
    # Try signing up
    signup_res = requests.post(f'{BASE}/auth/signup', json={'name': name, 'email': email, 'password': password})
    if signup_res.status_code == 201:
        token = signup_res.json().get('accessToken') or signup_res.json().get('token')
        return token, signup_res.json().get('user')
    raise RuntimeError(f"Could not get or create customer {email}: {res.text} / {signup_res.text}")

def run():
    print("--- 1. Authenticate Customer A and Customer B ---")
    token_a, user_a = get_or_create_customer('ananya.rao@example.com', 'password123', 'Ananya Rao')
    headers_a = {'Authorization': f'Bearer {token_a}'}
    print(f"[OK] Customer A authenticated: {user_a['email']} (ID: {user_a['id']})")

    token_b, user_b = get_or_create_customer('priya.customer@example.com', 'password123', 'Priya Menon')
    headers_b = {'Authorization': f'Bearer {token_b}'}
    print(f"[OK] Customer B authenticated: {user_b['email']} (ID: {user_b['id']})")

    # Fetch products
    products = requests.get(f'{BASE}/products').json()
    p_list = products if isinstance(products, list) else products.get('data', products.get('items', products.get('products')))
    p1 = p_list[0]['id']
    p2 = p_list[1]['id']
    print(f"[OK] Products for testing: P1={p1} ({p_list[0]['name']}), P2={p2} ({p_list[1]['name']})")

    print("\n--- 2. Clear pre-existing wishlist items for clean verification ---")
    for item in requests.get(f'{BASE}/wishlist', headers=headers_a).json():
        requests.delete(f"{BASE}/wishlist/{item['productId']}", headers=headers_a)
    for item in requests.get(f'{BASE}/wishlist', headers=headers_b).json():
        requests.delete(f"{BASE}/wishlist/{item['productId']}", headers=headers_b)
    print("[OK] Wishlists cleaned for both customers")

    print("\n--- 3. Customer A likes/adds Product 1 to Wishlist ---")
    add_p1 = requests.post(f'{BASE}/wishlist', json={'productId': p1}, headers=headers_a)
    assert add_p1.status_code in [200, 201], f'Add P1 failed: {add_p1.text}'
    print(f"[OK] Customer A added Product 1: {add_p1.json().get('message')}")

    print("\n--- 4. Verify Wishlist Persistence in MySQL (simulate refresh) ---")
    persisted_a = requests.get(f'{BASE}/wishlist', headers=headers_a).json()
    assert len(persisted_a) == 1, f"Expected 1 item, got {len(persisted_a)}"
    assert persisted_a[0]['productId'] == p1, f"Expected {p1}, got {persisted_a[0]['productId']}"
    print(f"[OK] Customer A wishlist re-queried: Product 1 persists with details: {persisted_a[0]['product']['name']}")

    print("\n--- 5. Verify Strict Multi-Tenant User Isolation ---")
    items_b = requests.get(f'{BASE}/wishlist', headers=headers_b).json()
    assert len(items_b) == 0, f"Customer B should NOT see Customer A's item! Found: {items_b}"
    print("[OK] Customer B cannot see Customer A's wishlist items! Count is 0.")

    print("\n--- 6. Customer B likes/adds Product 2 to Wishlist ---")
    add_p2 = requests.post(f'{BASE}/wishlist', json={'productId': p2}, headers=headers_b)
    assert add_p2.status_code in [200, 201], f'Add P2 failed: {add_p2.text}'
    items_b_after = requests.get(f'{BASE}/wishlist', headers=headers_b).json()
    assert len(items_b_after) == 1 and items_b_after[0]['productId'] == p2
    print(f"[OK] Customer B wishlist contains Product 2: {items_b_after[0]['product']['name']}")

    print("\n--- 7. Verify Customer A's Wishlist is Unchanged ---")
    items_a_check = requests.get(f'{BASE}/wishlist', headers=headers_a).json()
    assert len(items_a_check) == 1 and items_a_check[0]['productId'] == p1
    print("[OK] Customer A wishlist is untouched and still only contains Product 1.")

    print("\n--- 8. Customer A removes Product 1 ---")
    del_p1 = requests.delete(f'{BASE}/wishlist/{p1}', headers=headers_a)
    assert del_p1.status_code == 200, f'Delete failed: {del_p1.text}'
    items_a_empty = requests.get(f'{BASE}/wishlist', headers=headers_a).json()
    assert len(items_a_empty) == 0
    print("[OK] Customer A removed Product 1: Wishlist is now empty.")

    print("\n--- 9. Customer B still has Product 2 unaffected ---")
    items_b_final = requests.get(f'{BASE}/wishlist', headers=headers_b).json()
    assert len(items_b_final) == 1 and items_b_final[0]['productId'] == p2
    print("[OK] Customer B wishlist still has Product 2 unaffected.")

    # Cleanup Customer B
    requests.delete(f'{BASE}/wishlist/{p2}', headers=headers_b)
    print("\n==================================================================")
    print("SUCCESS: ALL BACKEND WISHLIST & ISOLATION VERIFICATIONS PASSED!")
    print("==================================================================")

if __name__ == '__main__':
    run()
