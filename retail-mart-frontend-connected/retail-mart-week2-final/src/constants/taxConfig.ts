/**
 * Statutory Indian GST and Place of Supply Configuration for Retail Mart
 *
 * Seller Configuration:
 * - Default State: Telangana, India (State Code: 36)
 * - GSTIN: Unverified / Pending registration (No fake registration generated)
 * - Mode: 'preview' (Statutory estimation mode until verified GSTIN is supplied)
 */

export interface SellerTaxProfile {
  businessName: string;
  state: string;
  stateCode: string;
  country: string;
  registeredAddress: string;
  gstin: string | null;
  gstMode: "preview" | "live";
}

export const SELLER_TAX_PROFILE: SellerTaxProfile = {
  businessName: "Retail Mart India",
  state: "Telangana",
  stateCode: "36",
  country: "India",
  registeredAddress: "[Pending Registration - Proposed Origin: Hyderabad, Telangana]",
  gstin: null, // Pending client registration
  gstMode: "preview", // Non-live statutory estimation mode
};

export interface ProductTaxRule {
  hsn: string;
  rate: number; // e.g. 5, 12, 18
  description: string;
  verified: boolean;
}

/**
 * Statutory HSN and GST Rate Classifications for Catalog Products
 * Updated under CBIC Notification No. 09/2025-Central Tax (Rate) dated 17 September 2025
 * (effective 22 September 2025) revising apparel/footwear threshold to ₹2,500.
 */
export const PRODUCT_TAX_REGISTRY: Record<string, ProductTaxRule> = {
  "Cotton Crew T-Shirt": {
    hsn: "6109",
    rate: 5.0,
    description: "T-shirts, singlets and other vests, knitted or crocheted, of cotton (Value <= ₹2,500)",
    verified: true,
  },
  "Slim Fit Denim Jeans": {
    hsn: "6203",
    rate: 5.0,
    description: "Men's or boys' trousers, bib and brace overalls, breeches and shorts (Value <= ₹2,500)",
    verified: true,
  },
  "Stainless Steel Water Bottle 1L": {
    hsn: "7323",
    rate: 12.0,
    description: "Table, kitchen or other household articles and parts thereof, of iron or steel",
    verified: true,
  },
  "Wireless Earbuds Pro": {
    hsn: "8518",
    rate: 18.0,
    description: "Microphones, loudspeakers, headphones, earphones and combined microphone/speaker sets",
    verified: true,
  },
  "Non-Stick Frying Pan 26cm": {
    hsn: "7615",
    rate: 12.0,
    description: "Table, kitchen or other household articles and parts thereof, of aluminium",
    verified: true,
  },
  "Running Shoes - Trail": {
    hsn: "6404",
    rate: 5.0,
    description: "Footwear with outer soles of rubber, plastics, leather or composition leather (Value <= ₹2,500)",
    verified: true,
  },
  "Ceramic Coffee Mug Set": {
    hsn: "6912",
    rate: 12.0,
    description: "Ceramic tableware, kitchenware, other household articles and toilet articles",
    verified: true,
  },
  "Yoga Mat 6mm": {
    hsn: "9506",
    rate: 18.0,
    description: "Articles and equipment for general physical exercise, gymnastics, athletics, other sports",
    verified: true,
  },
  "Bluetooth Speaker Mini": {
    hsn: "8518",
    rate: 18.0,
    description: "Loudspeakers, whether or not mounted in their enclosures",
    verified: true,
  },
  "Leather Wallet - Bifold": {
    hsn: "4202",
    rate: 18.0,
    description: "Wallets, purses, key-pouches, cigarette-cases, tobacco-pouches, of leather",
    verified: true,
  },
};

/**
 * Standard Indian State Code Mapping for Place of Supply validation
 */
export const INDIAN_STATES_CODE_MAP: Record<string, string> = {
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
  "daman and diu": "25",
  "dadra and nagar haveli": "26",
  "maharashtra": "27",
  "andhra pradesh": "28",
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
};
