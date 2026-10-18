"""
Catalog Sample 36 Synchronization Script for Retail Mart
Idempotent script to sync the 36-product sample catalog with MySQL database.
Default mode is --dry-run. Pass --execute to apply changes.
"""

import sys
import json
from decimal import Decimal

# The 36 Canonical Sample Products for Retail Mart Internship Demo
CANONICAL_36_PRODUCTS = [
    # --- 1. Apparel (c-01) ---
    {
        "id": "p-1001",
        "name": "Cotton Crew T-Shirt",
        "sku": "APP-TSH-001",
        "category_id": "c-01",
        "category_name": "Apparel",
        "description": "Everyday crew neck t-shirt in 100% combed cotton.",
        "price": 499.00,
        "stock": 240,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1002",
        "name": "Slim Fit Denim Jeans",
        "sku": "APP-JNS-014",
        "category_id": "c-01",
        "category_name": "Apparel",
        "description": "Mid-rise slim fit jeans with a slight stretch for comfort.",
        "price": 1799.00,
        "stock": 58,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1011",
        "name": "Classic Fleece Pullover Hoodie",
        "sku": "APP-HOD-021",
        "category_id": "c-01",
        "category_name": "Apparel",
        "description": "Heavyweight brushed fleece hoodie with ribbed cuffs and kangaroo pocket.",
        "price": 1499.00,
        "stock": 85,
        "status": "active",
        "image_url": "/products/p-1011-hoodie.jpg",
    },
    {
        "id": "p-1012",
        "name": "Slim Fit Stretch Chino Trousers",
        "sku": "APP-CHN-008",
        "category_id": "c-01",
        "category_name": "Apparel",
        "description": "Tailored stretch chinos crafted from breathable cotton twill for all-day comfort.",
        "price": 1299.00,
        "stock": 64,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1013",
        "name": "Oxford Cotton Button-Down Shirt",
        "sku": "APP-SHT-019",
        "category_id": "c-01",
        "category_name": "Apparel",
        "description": "Classic casual button-down shirt woven from 100% long-staple cotton.",
        "price": 1199.00,
        "stock": 92,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1014",
        "name": "Water-Resistant Windbreaker Jacket",
        "sku": "APP-JKT-033",
        "category_id": "c-01",
        "category_name": "Apparel",
        "description": "Lightweight weather-resistant jacket with adjustable hood and zip pockets.",
        "price": 2199.00,
        "stock": 42,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1542736619-c0911cb5eb12?w=600&auto=format&fit=crop&q=80",
    },

    # --- 2. Footwear (c-02) ---
    {
        "id": "p-1006",
        "name": "Running Shoes - Trail",
        "sku": "FTW-RUN-031",
        "category_id": "c-02",
        "category_name": "Footwear",
        "description": "Grip-focused outsole built for uneven off-road terrain.",
        "price": 2499.00,
        "stock": 12,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1022",
        "name": "Classic Canvas Low-Top Sneakers",
        "sku": "FTW-SNK-015",
        "category_id": "c-02",
        "category_name": "Footwear",
        "description": "Timeless skate-inspired canvas sneakers with vulcanized non-slip rubber sole.",
        "price": 1299.00,
        "stock": 80,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1023",
        "name": "Breathable Mesh Knit Trainers",
        "sku": "FTW-TRN-042",
        "category_id": "c-02",
        "category_name": "Footwear",
        "description": "Featherlight everyday trainers with flexible EVA cushioning and breathable upper.",
        "price": 1899.00,
        "stock": 65,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1024",
        "name": "Leather Formal Oxford Shoes",
        "sku": "FTW-OXF-003",
        "category_id": "c-02",
        "category_name": "Footwear",
        "description": "Handcrafted formal cap-toe oxford shoes in polished genuine leather.",
        "price": 2799.00,
        "stock": 30,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1025",
        "name": "Casual Slip-On Leather Loafers",
        "sku": "FTW-LOA-028",
        "category_id": "c-02",
        "category_name": "Footwear",
        "description": "Soft-milled leather driving loafers with cushioned insole for everyday smart-casual wear.",
        "price": 1999.00,
        "stock": 44,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1026",
        "name": "Cushioned Athletic Sport Slides",
        "sku": "FTW-SLD-010",
        "category_id": "c-02",
        "category_name": "Footwear",
        "description": "Contoured water-friendly recovery slides with textured footbed.",
        "price": 799.00,
        "stock": 120,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&auto=format&fit=crop&q=80",
    },

    # --- 3. Electronics (c-03) ---
    {
        "id": "p-1004",
        "name": "Wireless Earbuds Pro",
        "sku": "ELE-EAR-009",
        "category_id": "c-03",
        "category_name": "Electronics",
        "description": "Bluetooth 5.3 earbuds with active noise cancellation.",
        "price": 2999.00,
        "stock": 132,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1009",
        "name": "Bluetooth Speaker Mini",
        "sku": "ELE-SPK-012",
        "category_id": "c-03",
        "category_name": "Electronics",
        "description": "Pocket-size speaker with 10 hours of battery life.",
        "price": 1499.00,
        "stock": 45,
        "status": "active",  # Activated from draft for demo
        "image_url": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1018",
        "name": "Over-Ear ANC Wireless Headphones",
        "sku": "ELE-HDP-025",
        "category_id": "c-03",
        "category_name": "Electronics",
        "description": "Hybrid active noise canceling headphones with 40mm neodymium drivers and 40h battery.",
        "price": 3999.00,
        "stock": 40,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1019",
        "name": "Smart Fitness Watch with Heart Rate",
        "sku": "ELE-WTC-017",
        "category_id": "c-03",
        "category_name": "Electronics",
        "description": "AMOLED touch display smartwatch with SpO2, heart-rate tracking, and IP68 water resistance.",
        "price": 2499.00,
        "stock": 67,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1020",
        "name": "Magnetic Wireless Power Bank 10000mAh",
        "sku": "ELE-PWR-004",
        "category_id": "c-03",
        "category_name": "Electronics",
        "description": "Slim 15W wireless magnetic power bank with 20W PD fast-charging USB-C port.",
        "price": 1299.00,
        "stock": 110,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1021",
        "name": "Full HD 1080p Streaming Webcam",
        "sku": "ELE-CAM-008",
        "category_id": "c-03",
        "category_name": "Electronics",
        "description": "Crisp 1080p 60fps auto-focus web camera with dual stereo noise-canceling microphones.",
        "price": 1699.00,
        "stock": 55,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80",
    },

    # --- 4. Home & Kitchen (c-04) ---
    {
        "id": "p-1003",
        "name": "Stainless Steel Water Bottle 1L",
        "sku": "HOM-BTL-022",
        "category_id": "c-04",
        "category_name": "Home & Kitchen",
        "description": "Double-wall insulated bottle, keeps drinks cold for 18 hours.",
        "price": 349.00,
        "stock": 75,  # Replenished from 0 for demo
        "status": "active",  # Activated from out-of-stock
        "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1005",
        "name": "Non-Stick Frying Pan 26cm",
        "sku": "HOM-PAN-005",
        "category_id": "c-04",
        "category_name": "Home & Kitchen",
        "description": "Aluminium frying pan with a 3-layer non-stick coating.",
        "price": 899.00,
        "stock": 76,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1621494547944-5ddbc84514b2?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1007",
        "name": "Ceramic Coffee Mug Set (4pc)",
        "sku": "HOM-MUG-018",
        "category_id": "c-04",
        "category_name": "Home & Kitchen",
        "description": "Set of 4 dishwasher-safe ceramic mugs, 300ml each.",
        "price": 649.00,
        "stock": 50,  # Replenished from 0 for demo
        "status": "active",  # Activated from out-of-stock
        "image_url": "https://images.unsplash.com/photo-1616241673111-508b4662c707?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1015",
        "name": "Stainless Steel Chef's Knife 8\"",
        "sku": "HOM-KNF-012",
        "category_id": "c-04",
        "category_name": "Home & Kitchen",
        "description": "High-carbon German stainless steel chef knife with ergonomic pakkawood handle.",
        "price": 1199.00,
        "stock": 60,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1016",
        "name": "Natural Bamboo Cutting Board Set",
        "sku": "HOM-BRD-007",
        "category_id": "c-04",
        "category_name": "Home & Kitchen",
        "description": "Durable organic bamboo 3-piece chopping boards with deep juice drip grooves.",
        "price": 799.00,
        "stock": 88,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1556037867-bc64ed32b2af?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1017",
        "name": "Compact Personal Smoothie Blender 600W",
        "sku": "HOM-BLN-030",
        "category_id": "c-04",
        "category_name": "Home & Kitchen",
        "description": "High-speed 600W single-serve nutrient blender with 2 BPA-free travel cups.",
        "price": 1899.00,
        "stock": 35,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80",
    },

    # --- 5. Sports & Fitness (c-05) ---
    {
        "id": "p-1008",
        "name": "Yoga Mat 6mm",
        "sku": "SPT-YOG-007",
        "category_id": "c-05",
        "category_name": "Sports & Fitness",
        "description": "Non-slip textured mat with a carry strap included.",
        "price": 799.00,
        "stock": 94,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1027",
        "name": "Rubber Hex Dumbbell Set 5kg (Pair)",
        "sku": "SPT-DMB-014",
        "category_id": "c-05",
        "category_name": "Sports & Fitness",
        "description": "Solid cast-iron hexagonal dumbbells coated with heavy-duty shock-absorbing rubber.",
        "price": 1499.00,
        "stock": 45,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1028",
        "name": "Heavy Resistance Loop Bands (5-Pack)",
        "sku": "SPT-RES-020",
        "category_id": "c-05",
        "category_name": "Sports & Fitness",
        "description": "Set of 5 natural latex resistance loop bands with progressive resistance levels (X-Light to X-Heavy).",
        "price": 599.00,
        "stock": 140,
        "status": "active",
        "image_url": "/products/p-1028-resistance-bands.jpg",
    },
    {
        "id": "p-1029",
        "name": "High-Density Foam Roller 45cm",
        "sku": "SPT-ROL-009",
        "category_id": "c-05",
        "category_name": "Sports & Fitness",
        "description": "Firm EPP foam roller for deep-tissue muscle massage and myofascial release.",
        "price": 699.00,
        "stock": 70,
        "status": "active",
        "image_url": "/products/p-1029-foam-roller.jpg",
    },
    {
        "id": "p-1030",
        "name": "Speed Skipping Jump Rope",
        "sku": "SPT-ROP-011",
        "category_id": "c-05",
        "category_name": "Sports & Fitness",
        "description": "Adjustable steel wire jump rope with 360-degree ball bearings for rapid cardio workouts.",
        "price": 399.00,
        "stock": 160,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1031",
        "name": "Waterproof Gym Duffel Bag with Shoe Pocket",
        "sku": "SPT-BAG-023",
        "category_id": "c-05",
        "category_name": "Sports & Fitness",
        "description": "35L lightweight tear-resistant gym sports duffel featuring ventilated separate shoe compartment.",
        "price": 1299.00,
        "stock": 52,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    },

    # --- 6. Accessories (c-06) ---
    {
        "id": "p-1010",
        "name": "Leather Wallet - Bifold",
        "sku": "ACC-WAL-003",
        "category_id": "c-06",
        "category_name": "Accessories",
        "description": "Genuine leather bifold wallet with 6 card slots.",
        "price": 999.00,
        "stock": 61,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1032",
        "name": "Polarized Aviator Sunglasses",
        "sku": "ACC-SUN-018",
        "category_id": "c-06",
        "category_name": "Accessories",
        "description": "Classic metal-frame teardrop aviators with UV400 anti-glare polarized lenses.",
        "price": 1199.00,
        "stock": 75,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1033",
        "name": "Classic Genuine Leather Dress Belt",
        "sku": "ACC-BLT-005",
        "category_id": "c-06",
        "category_name": "Accessories",
        "description": "Top-grain genuine Italian leather dress belt with brushed stainless alloy buckle.",
        "price": 849.00,
        "stock": 85,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1034",
        "name": "Minimalist Slim RFID Card Holder",
        "sku": "ACC-CRD-012",
        "category_id": "c-06",
        "category_name": "Accessories",
        "description": "Ultra-thin front-pocket aluminum and leather card holder with RFID anti-theft blocking.",
        "price": 699.00,
        "stock": 90,
        "status": "active",
        "image_url": "/products/p-1034-card-holder.jpg",
    },
    {
        "id": "p-1035",
        "name": "Canvas Everyday Commuter Backpack",
        "sku": "ACC-BCK-031",
        "category_id": "c-06",
        "category_name": "Accessories",
        "description": "Vintage water-repellent canvas laptop daypack with padded 15.6\" compartment.",
        "price": 1799.00,
        "stock": 38,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    },
    {
        "id": "p-1036",
        "name": "Stainless Steel Chronograph Watch",
        "sku": "ACC-WTC-009",
        "category_id": "c-06",
        "category_name": "Accessories",
        "description": "Precision Japanese quartz chronograph watch with stainless steel link bracelet and 50m water resistance.",
        "price": 3499.00,
        "stock": 25,
        "status": "active",
        "image_url": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80",
    },
]

def analyze_catalog():
    print(f"Total Canonical Products: {len(CANONICAL_36_PRODUCTS)}")
    
    # 1. Check for duplicate IDs
    ids = [p["id"] for p in CANONICAL_36_PRODUCTS]
    assert len(ids) == len(set(ids)), f"Duplicate IDs found: {[x for x in ids if ids.count(x) > 1]}"
    
    # 2. Check for duplicate SKUs
    skus = [p["sku"] for p in CANONICAL_36_PRODUCTS]
    assert len(skus) == len(set(skus)), f"Duplicate SKUs found: {[x for x in skus if skus.count(x) > 1]}"
    
    # 3. Check Category Counts
    from collections import Counter
    cats = Counter([p["category_name"] for p in CANONICAL_36_PRODUCTS])
    print(f"Categories Breakdown: {dict(cats)}")
    for cat, count in cats.items():
        assert count == 6, f"Category {cat} does not have exactly 6 products (has {count})"
        
    # 4. Check stocks
    zero_stocks = [p["id"] for p in CANONICAL_36_PRODUCTS if p["stock"] <= 0]
    assert not zero_stocks, f"Zero or negative stocks found in canonical catalog: {zero_stocks}"
    
    # 5. Check statuses
    non_active = [p["id"] for p in CANONICAL_36_PRODUCTS if p["status"] != "active"]
    assert not non_active, f"Non-active products found in canonical catalog: {non_active}"
    
# The 3 Explicit Updates required for Demo Purchase Readiness
DEMO_UPDATES = {
    "p-1003": {"stock": 75, "status": "active", "desc": "Stainless Steel Water Bottle 1L (Replenish stock to 75, active)"},
    "p-1007": {"stock": 50, "status": "active", "desc": "Ceramic Coffee Mug Set (4pc) (Replenish stock to 50, active)"},
    "p-1009": {"stock": 45, "status": "active", "desc": "Bluetooth Speaker Mini (Activate from draft to active, stock 45)"},
}

if __name__ == "__main__":
    analyze_catalog()
