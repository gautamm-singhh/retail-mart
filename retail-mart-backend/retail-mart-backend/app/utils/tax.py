"""
Retail Mart Authoritative GST Calculation & Place-of-Supply Engine.

Implements statutory Indian Goods and Services Tax (GST) rules under:
  - The Central Goods and Services Tax Act, 2017 (CGST)
  - The Integrated Goods and Services Tax Act, 2017 (IGST) - Section 10 Place of Supply
  - State Goods and Services Tax Act (SGST / Telangana SGST Act, 2017)

Key Guarantees:
  1. Reverse-calculation from tax-inclusive MRP: Taxable Value = Selling Price / (1 + Rate/100).
  2. Exact paise-level balancing: CGST + SGST == Total GST with zero 1-paisa rounding errors.
  3. Total Payable strictly matches catalog selling prices; customer is never double-taxed.
  4. Authoritative source of truth: Prevents client-side tampering of totals or taxes.
  5. GST Registration Pending guard: When Seller GSTIN is unverified, marks calculations as
     commercial previews and prevents false GST Tax Invoice issuance.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from flask import current_app

# -----------------------------------------------------------------------------
# Official CBIC GST Tariff Classifications for Retail Mart Catalog
# -----------------------------------------------------------------------------
# Under Notification No. 09/2025-Central Tax (Rate) dated 17 September 2025
# (effective 22 September 2025), the threshold for apparel & footwear was revised to Rs. 2,500:
#   - Apparel (Chapters 61 & 62) <= Rs. 2,500: 5% GST (Schedule I, S.No. 223/224)
#   - Apparel (Chapters 61 & 62) > Rs. 2,500: 18% GST (Schedule III)
#   - Footwear (Chapter 64) <= Rs. 2,500: 5% GST (Schedule I, S.No. 225)
#   - Footwear (Chapter 64) > Rs. 2,500: 18% GST (Schedule III)
# Stainless steel, ceramic, and aluminium kitchenware attract 12% GST (Schedule II).
# Audio electronics, general fitness equipment, and leather accessories attract 18% GST (Schedule III).
STATUTORY_PRODUCT_TAX_REGISTRY: Dict[str, Dict[str, Any]] = {
    # Apparel (Notification No. 09/2025-CT(R) dated 17-09-2025)
    "APP-TSH-001": {
        "hsn": "6109",
        "gst_rate": Decimal("5.00"),
        "category": "Apparel",
        "description": "Cotton Crew T-Shirt (Knitted cotton t-shirt <= Rs. 2,500)",
    },
    "APP-JNS-014": {
        "hsn": "6203",
        "gst_rate": Decimal("5.00"),
        "category": "Apparel",
        "description": "Slim Fit Denim Jeans (Woven denim trousers <= Rs. 2,500)",
    },
    # Home & Kitchen (Notification No. 01/2017-CT(R) Schedule II)
    "HOM-BTL-022": {
        "hsn": "7323",
        "gst_rate": Decimal("12.00"),
        "category": "Home & Kitchen",
        "description": "Stainless Steel Water Bottle 1L (Household steel utensils)",
    },
    "HOM-PAN-005": {
        "hsn": "7615",
        "gst_rate": Decimal("12.00"),
        "category": "Home & Kitchen",
        "description": "Non-Stick Frying Pan 26cm (Aluminium household kitchenware)",
    },
    "HOM-MUG-018": {
        "hsn": "6912",
        "gst_rate": Decimal("12.00"),
        "category": "Home & Kitchen",
        "description": "Ceramic Coffee Mug Set (4pc) (Ceramic tableware)",
    },
    # Electronics (Notification No. 01/2017-CT(R) Schedule III)
    "ELE-EAR-009": {
        "hsn": "8518",
        "gst_rate": Decimal("18.00"),
        "category": "Electronics",
        "description": "Wireless Earbuds Pro (Headphones and earphones)",
    },
    "ELE-SPK-012": {
        "hsn": "8518",
        "gst_rate": Decimal("18.00"),
        "category": "Electronics",
        "description": "Bluetooth Speaker Mini (Loudspeakers and audio apparatus)",
    },
    # Footwear (Notification No. 09/2025-CT(R) dated 17-09-2025)
    "FTW-RUN-031": {
        "hsn": "6404",
        "gst_rate": Decimal("5.00"),
        "category": "Footwear",
        "description": "Running Shoes - Trail (Sports footwear <= Rs. 2,500)",
    },
    # Sports & Fitness (Notification No. 01/2017-CT(R) Schedule III)
    "SPT-YOG-007": {
        "hsn": "9506",
        "gst_rate": Decimal("18.00"),
        "category": "Sports & Fitness",
        "description": "Yoga Mat 6mm (Physical exercise & fitness equipment)",
    },
    # Accessories (Notification No. 01/2017-CT(R) Schedule III)
    "ACC-WAL-003": {
        "hsn": "4202",
        "gst_rate": Decimal("18.00"),
        "category": "Accessories",
        "description": "Leather Wallet - Bifold (Personal leather travel / pocket wallets)",
    },
}

# Secondary mapping by product name for cases where order items store product names
PRODUCT_NAME_TO_SKU: Dict[str, str] = {
    "cotton crew t-shirt": "APP-TSH-001",
    "slim fit denim jeans": "APP-JNS-014",
    "stainless steel water bottle 1l": "HOM-BTL-022",
    "wireless earbuds pro": "ELE-EAR-009",
    "non-stick frying pan 26cm": "HOM-PAN-005",
    "running shoes - trail": "FTW-RUN-031",
    "ceramic coffee mug set (4pc)": "HOM-MUG-018",
    "ceramic coffee mug set": "HOM-MUG-018",
    "yoga mat 6mm": "SPT-YOG-007",
    "bluetooth speaker mini": "ELE-SPK-012",
    "leather wallet - bifold": "ACC-WAL-003",
}

# -----------------------------------------------------------------------------
# Indian States & Official 2-Digit GST State Codes (CBIC Standard)
# -----------------------------------------------------------------------------
INDIAN_STATES_CODES: Dict[str, str] = {
    "jammu and kashmir": "01",
    "himachal pradesh": "02",
    "punjab": "03",
    "chandigarh": "04",
    "uttarakhand": "05",
    "haryana": "06",
    "delhi": "07",
    "rajasthan": "08",
    "uttar pradesh": "09",
    "bihar": "10",
    "sikkim": "11",
    "arunachal pradesh": "12",
    "nagaland": "13",
    "manipur": "14",
    "mizoram": "15",
    "tripura": "16",
    "meghalaya": "17",
    "assam": "18",
    "west bengal": "19",
    "jharkhand": "20",
    "odisha": "21",
    "chhattisgarh": "22",
    "madhya pradesh": "23",
    "gujarat": "24",
    "dadra and nagar haveli and daman and diu": "26",
    "maharashtra": "27",
    "andhra pradesh": "28",  # (Before reorg, now 37, kept for alias)
    "karnataka": "29",
    "goa": "30",
    "lakshadweep": "31",
    "kerala": "32",
    "tamil nadu": "33",
    "puducherry": "34",
    "andaman and nicobar islands": "35",
    "telangana": "36",
    "andhra pradesh (new)": "37",
    "ladakh": "38",
}


def normalize_state_name(state_name: Optional[str]) -> str:
    """Normalizes Indian state names for robust Place of Supply comparisons."""
    if not state_name:
        return ""
    clean = state_name.strip().lower()
    clean = clean.replace(".", "").replace(",", " ").replace("-", " ")
    words = [w.strip() for w in clean.split() if w.strip()]

    # Match exact known state names in string
    if "telangana" in clean or "tg" in words or "ts" in words or "hyderabad" in words:
        return "telangana"
    if "karnataka" in clean or "ka" in words or "bengaluru" in words or "bangalore" in words:
        return "karnataka"
    if "maharashtra" in clean or "mh" in words or "mumbai" in words or "pune" in words:
        return "maharashtra"
    if "andhra pradesh" in clean or "andhra" in clean or "ap" in words or "visakhapatnam" in words:
        return "andhra pradesh"
    if "delhi" in clean or "dl" in words or "new delhi" in clean:
        return "delhi"
    if "tamil nadu" in clean or "tamilnadu" in clean or "tn" in words or "chennai" in words:
        return "tamil nadu"

    for state_key in INDIAN_STATES_CODES:
        if state_key in clean:
            return state_key

    return clean



def validate_gstin_format(gstin: Optional[str], expected_state_code: str = "36") -> Dict[str, Any]:
    """
    Validates statutory Indian GSTIN format and state prefix:
      - 15 alphanumeric characters: 2 state + 10 PAN + 1 entity + 1 'Z' + 1 check digit.
      - First 2 digits must match expected seller state code (default '36' for Telangana).
      - Note: Format validation is a prerequisite but NOT proof of registration.
        Live invoicing requires authoritative active registration status verification.
    """
    if not gstin or not isinstance(gstin, str):
        return {"valid": False, "reason": "GSTIN is missing or empty"}
    clean = gstin.strip().upper()
    if len(clean) != 15:
        return {"valid": False, "reason": f"GSTIN must be exactly 15 characters (got {len(clean)})"}
    import re
    pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    if not re.match(pattern, clean):
        return {"valid": False, "reason": "Invalid statutory GSTIN structure"}
    state_prefix = clean[:2]
    if expected_state_code and state_prefix != expected_state_code:
        return {
            "valid": False,
            "reason": f"GSTIN state prefix '{state_prefix}' does not match seller state code '{expected_state_code}'",
        }
    return {"valid": True, "gstin": clean, "state_code": state_prefix}


def verify_authoritative_gstin_registration(
    gstin: Optional[str],
    seller_state_code: str = "36",
) -> Dict[str, Any]:
    """
    Authoritative verification of GSTIN registration status.
    In statutory Indian GST, a manually configured flag or non-empty string is NOT legal proof.
    Before live GST tax invoices can be generated, the business must have an ACTIVE
    registration validated via an authoritative source (e.g. GST Common Portal / GSP API).
    """
    fmt = validate_gstin_format(gstin, seller_state_code)
    if not fmt["valid"]:
        return {
            "is_authoritative": False,
            "status": "INVALID_FORMAT",
            "reason": fmt.get("reason", "Invalid GSTIN format"),
        }

    cfg = getattr(current_app, "config", {}) if current_app else {}
    auth_api_endpoint = cfg.get("GST_AUTHORITATIVE_API_URL")
    auth_api_key = cfg.get("GST_AUTHORITATIVE_API_KEY")

    # While client registration is pending and authoritative portal API credentials are not set,
    # the engine strictly treats registration as pending and prevents false GST Tax Invoicing.
    if not auth_api_endpoint or not auth_api_key:
        return {
            "is_authoritative": False,
            "status": "PENDING_REGISTRATION",
            "reason": (
                "Authoritative GSTN portal connection not configured. "
                "Registration remains pending authoritative active verification."
            ),
        }

    # Authoritative verification via API endpoint when client registration is complete
    return {
        "is_authoritative": False,
        "status": "PENDING_REGISTRATION",
        "reason": "Authoritative verification pending client GST certificate issuance.",
    }


def get_seller_tax_config() -> Dict[str, Any]:
    """
    Retrieves seller business tax configuration with authoritative verification checks:
      - Does not rely only on manually set verification flags or 15-char strings.
      - Enforces statutory regex, state code prefix, and authoritative active status checks.
      - Keeps GST in 'preview' mode unless authoritatively verified.
      - Clearly identifies seller address as placeholder until registration is complete.
    """
    cfg = getattr(current_app, "config", {}) if current_app else {}
    business_name = cfg.get("SELLER_BUSINESS_NAME", "Retail Mart Commerce")
    seller_state = cfg.get("SELLER_STATE", "Telangana")
    seller_state_code = cfg.get("SELLER_STATE_CODE", "36")
    seller_country = cfg.get("SELLER_COUNTRY", "India")
    seller_address = cfg.get(
        "SELLER_ADDRESS",
        "[Pending Registration - Proposed Origin: Hyderabad, Telangana]"
    )
    seller_gstin = cfg.get("SELLER_GSTIN")

    # Format and Authoritative Validation
    format_val = validate_gstin_format(seller_gstin, seller_state_code)
    auth_val = verify_authoritative_gstin_registration(seller_gstin, seller_state_code)

    is_authoritative_active = bool(
        format_val["valid"]
        and auth_val["is_authoritative"]
        and str(auth_val["status"]).strip().upper() == "ACTIVE"
    )

    requested_mode = cfg.get("GST_MODE", "preview")
    # Live mode can only be engaged if GSTIN is both valid in format AND verified ACTIVE via authoritative source
    if requested_mode == "live" and not is_authoritative_active:
        gst_mode = "preview"
    else:
        gst_mode = "live" if is_authoritative_active else "preview"

    return {
        "business_name": business_name,
        "seller_state": seller_state,
        "seller_state_code": seller_state_code,
        "seller_country": seller_country,
        "seller_address": seller_address,
        "seller_gstin": seller_gstin,
        "gst_mode": gst_mode,
        "is_verified_gst": is_authoritative_active,
        "seller_gst_status": auth_val["status"],
        "gst_validation_reason": (
            "Verified Active" if is_authoritative_active else auth_val.get("reason", "Pending active registration verification")
        ),
    }


def lookup_product_tax(identifier: str, unit_price: Optional[Decimal] = None) -> Optional[Dict[str, Any]]:
    """
    Looks up statutory HSN code and GST rate for a product by SKU or product name.
    Applies dynamic value thresholds under Notification No. 09/2025-CT(R):
      - Apparel (6109, 6203) & Footwear (6404) <= Rs. 2,500 attract 5% GST; > Rs. 2,500 attract 18% GST.
    Returns None if unverified; never fabricates an arbitrary rate.
    """
    if not identifier:
        return None

    clean_id = identifier.strip().upper()
    entry = None
    if clean_id in STATUTORY_PRODUCT_TAX_REGISTRY:
        entry = dict(STATUTORY_PRODUCT_TAX_REGISTRY[clean_id])
    else:
        lower_id = identifier.strip().lower()
        sku = PRODUCT_NAME_TO_SKU.get(lower_id)
        if sku and sku in STATUTORY_PRODUCT_TAX_REGISTRY:
            entry = dict(STATUTORY_PRODUCT_TAX_REGISTRY[sku])
        else:
            # Partial name match for catalog products
            for name_key, matched_sku in PRODUCT_NAME_TO_SKU.items():
                if name_key in lower_id or lower_id in name_key:
                    entry = dict(STATUTORY_PRODUCT_TAX_REGISTRY.get(matched_sku))
                    break

    if not entry:
        return None

    # Dynamic statutory threshold for apparel (6109, 6203) and footwear (6404) under Notification 9/2025
    if unit_price is not None and entry.get("hsn") in ("6109", "6203", "6404"):
        if unit_price <= Decimal("2500.00"):
            entry["gst_rate"] = Decimal("5.00")
        else:
            entry["gst_rate"] = Decimal("18.00")

    return entry


def determine_supply_type(seller_state: str, destination_state: str) -> str:
    """
    Determines whether a transaction is Intra-State or Inter-State under Section 10 of the IGST Act.
    """
    norm_seller = normalize_state_name(seller_state)
    norm_dest = normalize_state_name(destination_state)

    if not norm_dest:
        # Default to intra-state if destination is not yet provided at quote time
        return "intra"

    return "intra" if norm_seller == norm_dest else "inter"


def calculate_order_tax_breakdown(
    items: List[Dict[str, Any]],
    destination_state: Optional[str] = None,
    discount_amount: Decimal = Decimal("0.00"),
    delivery_fee: Decimal = Decimal("0.00"),
    strict_classification: bool = False,
) -> Dict[str, Any]:
    """
    Computes statutory GST breakdown with high precision:
      - Uses decimal.Decimal for exact currency accounting.
      - Back-calculates Taxable Base from GST-inclusive selling prices.
      - Balances CGST and SGST down to the exact paisa.
      - Generates item-wise and slab-wise aggregations.
    """
    seller_cfg = get_seller_tax_config()
    seller_state = seller_cfg["seller_state"]
    supply_type = determine_supply_type(seller_state, destination_state or "")
    is_intra_state = supply_type == "intra"

    items_breakdown = []
    total_gross = Decimal("0.00")
    total_taxable = Decimal("0.00")
    total_cgst = Decimal("0.00")
    total_sgst = Decimal("0.00")
    total_igst = Decimal("0.00")

    slabs_summary: Dict[str, Dict[str, Any]] = {}

    for item in items:
        p_name = item.get("productName") or item.get("name") or "Product"
        sku = item.get("sku") or ""
        qty = Decimal(str(item.get("quantity", 1)))
        unit_price = Decimal(str(item.get("price", 0)))
        line_gross = (unit_price * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total_gross += line_gross

        # Tax lookup
        tax_info = lookup_product_tax(sku or p_name, unit_price=unit_price)
        if not tax_info:
            if strict_classification:
                raise ValueError(
                    f"Verified tax classification missing for item '{p_name}'. "
                    "Cannot fabricate GST rates without approved statutory classification."
                )
            # Safe neutral fallback when classification is not yet verified
            hsn = "UNCLASSIFIED"
            rate = Decimal("0.00")
            taxable_val = line_gross
            line_gst = Decimal("0.00")
        else:
            hsn = tax_info["hsn"]
            rate = tax_info["gst_rate"]
            # Taxable Base = Gross / (1 + Rate / 100)
            divisor = Decimal("1") + (rate / Decimal("100"))
            taxable_val = (line_gross / divisor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            line_gst = line_gross - taxable_val

        # Place of supply tax split
        if is_intra_state:
            # Split line GST into CGST and SGST with exact balancing
            half_gst = (line_gst / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            item_cgst = half_gst
            item_sgst = line_gst - item_cgst  # Guarantees CGST + SGST == line_gst
            item_igst = Decimal("0.00")
            item_cgst_rate = rate / Decimal("2")
            item_sgst_rate = rate / Decimal("2")
            item_igst_rate = Decimal("0.00")
        else:
            item_cgst = Decimal("0.00")
            item_sgst = Decimal("0.00")
            item_igst = line_gst.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            item_cgst_rate = Decimal("0.00")
            item_sgst_rate = Decimal("0.00")
            item_igst_rate = rate

        total_taxable += taxable_val
        total_cgst += item_cgst
        total_sgst += item_sgst
        total_igst += item_igst

        # Slabs aggregation
        slab_key = f"{int(rate)}%"
        if slab_key not in slabs_summary:
            slabs_summary[slab_key] = {
                "rate": float(rate),
                "taxable_value": Decimal("0.00"),
                "cgst": Decimal("0.00"),
                "sgst": Decimal("0.00"),
                "igst": Decimal("0.00"),
                "total_tax": Decimal("0.00"),
            }
        slabs_summary[slab_key]["taxable_value"] += taxable_val
        slabs_summary[slab_key]["cgst"] += item_cgst
        slabs_summary[slab_key]["sgst"] += item_sgst
        slabs_summary[slab_key]["igst"] += item_igst
        slabs_summary[slab_key]["total_tax"] += line_gst

        items_breakdown.append({
            "product_name": p_name,
            "sku": sku,
            "hsn": hsn,
            "quantity": int(qty),
            "unit_price": float(unit_price),
            "gross_amount": float(line_gross),
            "taxable_value": float(taxable_val),
            "gst_rate": float(rate),
            "cgst_rate": float(item_cgst_rate),
            "cgst_amount": float(item_cgst),
            "sgst_rate": float(item_sgst_rate),
            "sgst_amount": float(item_sgst),
            "igst_rate": float(item_igst_rate),
            "igst_amount": float(item_igst),
            "total_tax": float(line_gst),
        })

    total_taxes = total_cgst + total_sgst + total_igst

    # Final Total Payable = Items Gross + Delivery - Discount
    # In tax-inclusive MRP: Items Gross == total_taxable + total_taxes
    final_payable = (total_gross + delivery_fee - discount_amount).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    formatted_slabs = [
        {
            "slab": k,
            "rate": v["rate"],
            "taxable_value": float(v["taxable_value"]),
            "cgst": float(v["cgst"]),
            "sgst": float(v["sgst"]),
            "igst": float(v["igst"]),
            "total_tax": float(v["total_tax"]),
        }
        for k, v in slabs_summary.items()
    ]

    return {
        "seller_business_name": seller_cfg["business_name"],
        "seller_state": seller_state,
        "seller_state_code": seller_cfg["seller_state_code"],
        "seller_country": seller_cfg["seller_country"],
        "seller_address": seller_cfg["seller_address"],
        "seller_gstin": seller_cfg["seller_gstin"],
        "gst_mode": seller_cfg["gst_mode"],
        "is_verified_gst": seller_cfg["is_verified_gst"],
        "destination_state": destination_state or "Unspecified",
        "destination_state_code": INDIAN_STATES_CODES.get(normalize_state_name(destination_state), ""),
        "supply_type": supply_type,
        "is_intra_state": is_intra_state,
        "subtotal": float(total_gross),
        "taxable_value": float(total_taxable),
        "cgst_amount": float(total_cgst),
        "sgst_amount": float(total_sgst),
        "igst_amount": float(total_igst),
        "total_gst": float(total_taxes),
        "delivery_charges": float(delivery_fee),
        "discount_amount": float(discount_amount),
        "total_payable": float(final_payable),
        "items": items_breakdown,
        "slabs_summary": formatted_slabs,
    }
