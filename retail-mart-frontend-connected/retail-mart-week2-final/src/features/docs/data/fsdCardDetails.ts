export interface FsdCardDetail {
  icon: string;
  tag: string;
  title: string;
  body: string;
}

export const FSD_CARD_DETAILS: Record<string, FsdCardDetail> = {
  storefront: {
    icon: "🛍️",
    tag: "System Overview",
    title: "Storefront",
    body: `<p>The customer-facing half of the single React SPA, mounted under <code>/shop</code> and wrapped in <code>StorefrontLayout</code>.</p>
<ul>
  <li>Public browsing: home, category filters, search, and product detail pages.</li>
  <li>Cart is client-side React state; checkout posts directly to <code>POST /api/orders</code>.</li>
  <li>Wishlist, My Orders, Account dashboard and Checkout are gated to the <code>Customer</code> role via <code>ProtectedRoute</code>, redirecting to <code>/shop/login</code> otherwise.</li>
  <li>Account dashboard is powered live by <code>GET /api/customer/stats/summary</code> — total spent, orders, items, active shipments.</li>
</ul>`,
  },
  "ops-console": {
    icon: "⚙️",
    tag: "System Overview",
    title: "Operations Console",
    body: `<p>The internal back-office half of the SPA, mounted under <code>/</code> and wrapped in <code>AdminLayout</code>.</p>
<ul>
  <li>Gated to <code>Admin</code>, <code>Manager</code> and <code>Staff</code> via <code>ProtectedRoute</code>; a signed-in Customer is redirected to <code>/shop</code>.</li>
  <li>Covers Dashboard, Users, Products, Categories, Orders, Payments, Refunds, Shipping, Couriers, Communications, Campaigns, Reports and Analytics.</li>
  <li>Every write action is independently re-validated server-side by <code>@roles_required(...)</code> — hiding a button client-side is UX only, never the security boundary.</li>
</ul>`,
  },
  "exec-intelligence": {
    icon: "📊",
    tag: "System Overview",
    title: "Executive Intelligence",
    body: `<p>The reporting and forecasting layer, restricted to <code>Admin</code> and <code>Manager</code>.</p>
<ul>
  <li><code>GET /api/reports/analytics-summary</code> returns executive totals, monthly trends, category/status/payment-method breakdowns and top products.</li>
  <li>All aggregation happens in SQL (<code>SUM</code>/<code>COUNT</code>/<code>GROUP BY</code>) — no name, email or phone column is ever selected.</li>
  <li><code>GET /api/analytics/ai-projections</code> layers an optional Gemini-generated narrative on top of a hand-rolled linear-regression forecast, always in INR.</li>
</ul>`,
  },
  "repo-frontend": {
    icon: "💻",
    tag: "Repository",
    title: "retail-mart-frontend-connected",
    body: `<p>React 18 + TypeScript + Vite SPA. Contains both the Operations Admin Console (<code>/dashboard</code>, <code>/products</code>, <code>/orders</code>…) and the Storefront (<code>/shop</code>, <code>/shop/cart</code>, <code>/shop/account</code>…) under one router, sharing a single AuthContext / JWT.</p>
<ul>
  <li>Two gated portals sharing one <code>AuthContext</code> / JWT: the Admin Console (<code>ProtectedRoute allowedRoles={["Admin","Manager","Staff"]}</code>) and the Storefront (<code>allowedRoles={["Customer"]}</code>).</li>
  <li>React Router DOM 6.26 handles client routing; Tailwind CSS 3.4 supplies the design tokens.</li>
  <li>Covered by Vitest test suites via Testing Library.</li>
</ul>`,
  },
  "repo-backend": {
    icon: "💻",
    tag: "Repository",
    title: "retail-mart-backend",
    body: `<p>Flask 3.0 application factory (<code>app/__init__.py</code>) registering 17 modular blueprints under <code>/api/*</code>, backed by SQLAlchemy 2.0 models and a MySQL 8.0 database (SQLite fallback for local dev).</p>
<ul>
  <li>18 blueprint files under <code>app/routes/*.py</code>, one per resource, each guarded by <code>@roles_required(...)</code>.</li>
  <li>11 SQLAlchemy model files define the 17-table schema; MySQL 8.0 in production with an automatic SQLite fallback for local dev.</li>
  <li>Exercised by <code>test_verification.py</code> and <code>test_e2e_wishlist.py</code> for API and business-flow coverage.</li>
</ul>`,
  },
  "courier-tracking": {
    icon: "🚚",
    tag: "Integration",
    title: "Courier Tracking",
    body: `<p>Implemented in <code>app/utils/courier_tracker.py</code>, resolved in priority order:</p>
<ul>
  <li><strong>TrackingMore API</strong> or <strong>Ship24 API</strong> when the corresponding key is configured.</li>
  <li><strong>Carrier Sandbox adapter</strong> otherwise — simulates realistic checkpoints so tracking UI is fully testable with no live key.</li>
  <li>External carrier signals are normalized into Retail Mart's own status set (Pending, Packed, Shipped, Out for Delivery, Delivered, Exception) — see the mapping table in Shipping & Couriers.</li>
  <li><code>POST /shipments/&lt;id&gt;/sync-tracking</code> pulls the live status and auto-advances the local shipment when it maps to a valid next state.</li>
</ul>`,
  },
  "smtp-email": {
    icon: "✉️",
    tag: "Integration",
    title: "SMTP Email",
    body: `<p>Implemented in <code>app/utils/email.py</code> as a dual-protocol SMTP engine.</p>
<ul>
  <li>Supports SSL (port 465) and STARTTLS (port 587/25), selected automatically from <code>SMTP_PORT</code>.</li>
  <li>When <code>SMTP_HOST</code> is unset, emails are logged to the console instead of sent — every email-triggering request still completes (best-effort dispatch, never blocking).</li>
  <li>Powers 8 automated lifecycle emails (welcome, order confirmation, receipt, shipped, arrived, out-for-delivery, delivered, thank-you) plus campaign bulk sends.</li>
  <li><code>GET /api/communications/smtp-status</code> validates the connection without ever logging the password.</li>
</ul>`,
  },
  razorpay: {
    icon: "💳",
    tag: "Integration",
    title: "RazorPay",
    body: `<p>Live payment gateway, wired through a 2-step flow:</p>
<ul>
  <li><code>POST /payments/razorpay/order</code> creates a RazorPay order for an existing Payment record (amount converted to paise).</li>
  <li><code>POST /payments/razorpay/verify</code> verifies the returned signature; on success the Payment is marked <code>Paid</code>, method <code>RazorPay</code>, and the order's <code>paymentStatus</code> is synced.</li>
  <li>Without live <code>RAZORPAY_KEY_ID</code>/<code>RAZORPAY_KEY_SECRET</code>, <code>app/utils/razorpay_client.py</code> supplies a mock client so checkout works end-to-end in development.</li>
  <li>A successful verify automatically triggers the receipt email with a generated PDF attached.</li>
</ul>`,
  },
  "gemini-ai": {
    icon: "🧠",
    tag: "Integration",
    title: "Gemini AI",
    body: `<p>Google Gemini (<code>google.generativeai</code>) adds a narrative layer to the statistical revenue forecast.</p>
<ul>
  <li>Default model <code>gemini-2.0-flash</code>, overridable via <code>GEMINI_MODEL</code>.</li>
  <li>Runs in a worker thread with a hard 17-second timeout so the request can never hang.</li>
  <li>The system prompt mandates strict INR formatting and forbids the <code>$</code> symbol; any stray <code>$</code> in the response is additionally replaced with ₹ as a safety net.</li>
  <li>If the key is unset, the call errors, or it times out, a templated statistical narrative is returned instead — <code>aiGenerated: false</code>, request never fails outright.</li>
</ul>`,
  },
  "feat-catalog": {
    icon: "🔍",
    tag: "Customer Experience",
    title: "Catalog Browsing",
    body: `<p><code>GET /api/products</code> is public and supports <code>?category=</code>, <code>?status=</code> and <code>?search=</code> (matches product name or SKU, case-insensitive).</p>
<p>Category read access (<code>GET /api/categories</code>) is also public, with a live <code>productCount</code> computed from the relationship for each category card.</p>`,
  },
  "feat-cart-checkout": {
    icon: "🛒",
    tag: "Customer Experience",
    title: "Cart & Checkout",
    body: `<p>The cart itself is client-side React state — nothing is persisted server-side until checkout.</p>
<ul>
  <li>Checkout submits address + items to <code>POST /api/orders</code>, shared with the admin console's manual order entry.</li>
  <li>Every created order automatically creates exactly one linked Payment in <code>Pending</code> status.</li>
  <li>An order confirmation email is fired best-effort immediately after creation.</li>
</ul>`,
  },
  "feat-wishlist": {
    icon: "♡",
    tag: "Customer Experience",
    title: "Wishlist",
    body: `<p>Backed by the <code>wishlist_items</code> table with a unique constraint on <code>(user_id, product_id)</code>.</p>
<ul>
  <li><code>POST /api/wishlist</code> is idempotent — re-adding a product already on the list returns the existing item with 200 rather than erroring.</li>
  <li><code>DELETE /api/wishlist/&lt;product_id&gt;</code> accepts either a product ID or a wishlist item ID.</li>
  <li>Always scoped to the caller's own <code>user_id</code> — strict per-customer isolation.</li>
</ul>`,
  },
  "feat-account-dashboard": {
    icon: "👤",
    tag: "Customer Experience",
    title: "Account Dashboard",
    body: `<p><code>GET /api/customer/stats/summary</code> computes, live and scoped to the caller:</p>
<ul>
  <li>Total orders, total spent, total items purchased, unique products purchased.</li>
  <li>Active shipment count.</li>
  <li>Last order date, plus last-30-day order count and spend.</li>
  <li>A per-category spend breakdown array.</li>
</ul>`,
  },
  "feat-order-history": {
    icon: "📋",
    tag: "Customer Experience",
    title: "Order History & Tracking",
    body: `<p><code>GET /api/orders/mine</code> filters strictly to the JWT's <code>user_id</code> — the same underlying Order model powers both the storefront view and the admin console's full order list.</p>
<p>Order-linked shipments can be tracked live via <code>GET /shipments/&lt;id&gt;/track</code>, which a Customer may only call for their own shipment.</p>`,
  },
  "feat-invoices": {
    icon: "📄",
    tag: "Customer Experience",
    title: "Invoices & Receipts",
    body: `<p>Two distinct generated PDF documents:</p>
<ul>
  <li><strong>Invoice</strong> — <code>GET /api/orders/&lt;id&gt;/invoice</code>, available to Admin/Manager/Staff or the owning Customer.</li>
  <li><strong>Receipt</strong> — <code>GET /api/payments/&lt;id&gt;/receipt</code>, only once the payment is <code>Paid</code>; the <code>Receipt</code> row is lazily created on first download.</li>
</ul>`,
  },
  "feat-user-admin": {
    icon: "👥",
    tag: "Operations Management",
    title: "User Administration",
    body: `<p><code>/api/users</code> is Admin-only for writes (Admin+Manager can read).</p>
<ul>
  <li><code>POST /</code> creates a user with a default password of <code>changeme123</code> if none is supplied.</li>
  <li><code>PATCH /&lt;id&gt;/status</code> activates/deactivates without a full update.</li>
  <li>The list excludes Customers by design — this endpoint manages internal Staff/Manager/Admin accounts only.</li>
</ul>`,
  },
  "feat-catalog-admin": {
    icon: "📦",
    tag: "Operations Management",
    title: "Catalog Administration",
    body: `<p>Full CRUD over products and categories (Admin/Manager write, Admin-only delete).</p>
<ul>
  <li><code>sync_status_with_stock()</code> automatically forces a product to <code>out-of-stock</code> the moment stock hits zero, and back to <code>active</code> on restock.</li>
  <li>Category deletion returns 409 while any product still references it.</li>
</ul>`,
  },
  "feat-order-lifecycle": {
    icon: "🔄",
    tag: "Operations Management",
    title: "Order Lifecycle",
    body: `<p><code>PATCH /api/orders/&lt;id&gt;/status</code> enforces <code>ORDER_STATUS_TRANSITIONS</code> server-side — <code>Pending → Processing → Shipped → Delivered</code>, with Pending/Processing additionally able to move to <code>Cancelled</code>.</p>
<p>Any transition not in that map returns 409, and every accepted change appends a row to <code>order_status_history</code> recording who made it.</p>`,
  },
  "feat-payments-refunds": {
    icon: "💳",
    tag: "Operations Management",
    title: "Payments & Refunds",
    body: `<p>The admin console splits Payments and Refunds into separate views, both backed by the same <code>payments</code> table filtered by status.</p>
<ul>
  <li><code>PATCH /payments/&lt;id&gt;/status</code> marking <code>Paid</code> auto-triggers the receipt email.</li>
  <li>RazorPay order creation and signature verification share this same resource.</li>
</ul>`,
  },
  "feat-courier-registry": {
    icon: "🚚",
    tag: "Operations Management",
    title: "Courier Registry",
    body: `<p>Couriers are first-class records (<code>couriers</code> table) with a <code>tracking_url_template</code> using the literal placeholder <code>{tracking_number}</code>.</p>
<ul>
  <li>Staff can read the registry (so the Shipment form dropdown works) but cannot create/edit.</li>
  <li>Admin/Manager can create or edit; only Admin can delete, blocked (409) while any shipment still references the courier.</li>
</ul>`,
  },
  "feat-awb-automation": {
    icon: "🏷️",
    tag: "Operations Management",
    title: "Shipment & AWB Automation",
    body: `<p>When a shipment is created without a manual tracking number, <code>app/utils/courier_tracker.py</code> generates a carrier-spec AWB — e.g. Bluedart <code>BD</code>+9 digits, Delhivery <code>DEL</code>+10 digits, FedEx <code>FX</code>+10 digits.</p>
<p>Delivery status then advances through a strictly sequential 5-state workflow, cascading automatically to the parent order's status.</p>`,
  },
  "feat-trans-email": {
    icon: "✉️",
    tag: "Communications",
    title: "Transactional Email",
    body: `<p>8 automated lifecycle emails: welcome (signup), order confirmation, payment receipt (PDF attached), shipment shipped, shipment arrived at hub, out for delivery, delivered, and a post-delivery thank-you.</p>
<p>All dispatch is best-effort — a failed send never fails the triggering API request.</p>`,
  },
  "feat-campaigns": {
    icon: "🎉",
    tag: "Communications",
    title: "Marketing Campaigns",
    body: `<p>Campaigns carry a unique discount code, <code>percentage</code> or <code>flat</code> discount type, a date range and a <code>scheduled</code>/<code>active</code>/<code>ended</code> lifecycle.</p>
<p><code>POST /campaigns/&lt;id&gt;/send</code> emails every <code>active</code>-status user via a single reused authenticated SMTP session, and auto-promotes a <code>scheduled</code> campaign to <code>active</code>.</p>`,
  },
  "feat-exec-reports": {
    icon: "📊",
    tag: "Intelligence",
    title: "Executive Reports",
    body: `<p><code>GET /api/reports/&lt;period&gt;</code> (daily/monthly/yearly) returns ordered <code>{period, orderCount, revenue}</code> buckets excluding Cancelled orders.</p>
<p><code>GET /api/reports/analytics-summary</code> layers on executive totals, trends, and category/status/payment breakdowns, rendered as dependency-free inline SVG charts on the frontend.</p>`,
  },
  "feat-ai-forecasting": {
    icon: "🧠",
    tag: "Intelligence",
    title: "AI Revenue Forecasting",
    body: `<p>A hand-rolled ordinary-least-squares linear regression (<code>app/utils/projections.py</code>) fits historical period revenue and projects 1–12 periods ahead, floored at zero.</p>
<p><code>GET /api/analytics/ai-projections</code> wraps that forecast with an optional Gemini-generated INR executive narrative, falling back to a templated statistical summary when AI is unavailable.</p>`,
  },
  "role-admin": {
    icon: "👤",
    tag: "Role",
    title: "Admin",
    body: `<p><strong>Full Access</strong></p>
<ul>
  <li>Create/edit/delete users</li>
  <li>Delete products, categories, orders, campaigns, couriers</li>
  <li>All Manager + Staff capabilities</li>
</ul>`,
  },
  "role-manager": {
    icon: "👤",
    tag: "Role",
    title: "Manager",
    body: `<p><strong>Operations Lead</strong></p>
<ul>
  <li>Products, categories, orders, shipments, couriers (create/edit)</li>
  <li>Reports, analytics & AI projections</li>
  <li>Update order & payment status</li>
</ul>`,
  },
  "role-staff": {
    icon: "👤",
    tag: "Role",
    title: "Staff",
    body: `<p><strong>Day-to-day Ops</strong></p>
<ul>
  <li>View orders, payments, shipments, couriers</li>
  <li>Create shipments & update shipment status</li>
  <li>No delete rights; no reports/analytics access</li>
</ul>`,
  },
  "role-customer": {
    icon: "👤",
    tag: "Role",
    title: "Customer",
    body: `<p><strong>Storefront</strong></p>
<ul>
  <li>Browse, cart, checkout, wishlist</li>
  <li>Own orders, addresses, payments, invoices only</li>
  <li>No access to admin console endpoints</li>
</ul>`,
  },
  "auth-staff-password": {
    icon: "🔑",
    tag: "Auth Method",
    title: "Email + Password (Staff)",
    body: `<p><code>POST /api/auth/register</code> creates a self-service account defaulting to the <code>Staff</code> role.</p>
<ul>
  <li>Self-service signup — no invite required — always lands the new account in the <code>Staff</code> role; promotion to Manager/Admin is an explicit later action by an Admin.</li>
  <li>Distinct from customer signup: it never touches the storefront's <code>Customer</code> role.</li>
</ul>`,
  },
  "auth-customer-password": {
    icon: "🔑",
    tag: "Auth Method",
    title: "Email + Password (Customer)",
    body: `<p><code>POST /api/auth/signup</code> creates a <code>Customer</code> account and best-effort sends a welcome email.</p>
<ul>
  <li>Dedicated storefront entry point, separate from the internal <code>/auth/register</code> path used by Staff/Manager/Admin.</li>
  <li>Fires a best-effort welcome email immediately on account creation — it never blocks signup if SMTP is unreachable.</li>
</ul>`,
  },
  "auth-otp": {
    icon: "🔑",
    tag: "Auth Method",
    title: "Phone OTP (Customer)",
    body: `<p><code>POST /api/auth/otp/request</code> then <code>/otp/verify</code> — a 6-digit code (10-minute TTL) either logs in an existing phone or silently creates a new <code>Customer</code> account.</p>
<ul>
  <li>Codes are 6 digits with a 10-minute expiry, stored in the standalone <code>otp_verifications</code> table and matched by phone at verify time.</li>
  <li>A verified OTP against an unknown phone silently provisions a new <code>Customer</code> — there's no separate "OTP sign-up" step.</li>
</ul>`,
  },
  "ship-endpoint-track": {
    icon: "🚚",
    tag: "Endpoint",
    title: "GET /shipments/<id>/track",
    body: `<p>Returns local tracking history plus a live external lookup (TrackingMore / Ship24 / Sandbox), a resolved <code>trackingUrl</code>, and normalized status. Customers can only track their own shipments.</p>
<ul>
  <li>Merges Retail Mart's own <code>shipment_status_history</code> rows with a live pull from TrackingMore, Ship24, or the Carrier Sandbox fallback.</li>
  <li>Access is role-checked: a Customer calling this can only ever see a shipment tied to their own order.</li>
</ul>`,
  },
  "ship-endpoint-sync": {
    icon: "🚚",
    tag: "Endpoint",
    title: "POST /shipments/<id>/sync-tracking",
    body: `<p>Fetches the external carrier's current status and, if it maps to a valid next state, advances the local shipment (and order) automatically.</p>
<ul>
  <li>Normalizes whatever the external carrier reports into Retail Mart's own status vocabulary before applying it.</li>
  <li>Only advances the local shipment (and its parent order) when the mapped status is a valid forward transition — it never silently skips or reverses state.</li>
</ul>`,
  },
  "campaign-diwali": {
    icon: "🎉",
    tag: "Campaign Template",
    title: "Diwali Mega Sale",
    body: `<p>Flat 40% off across all categories. Code <code>DIWALI40</code>.</p>
<ul>
  <li>Pre-filled in <code>CampaignForm.tsx</code> as a starting point — Admin/Manager can edit the discount, code, dates and audience before saving.</li>
  <li>Once sent, delivery goes through the same SMTP engine as transactional email, with per-recipient dispatch logged.</li>
</ul>`,
  },
  "campaign-holi": {
    icon: "🎉",
    tag: "Campaign Template",
    title: "Holi Festival Dhamaka",
    body: `<p>Up to 50% off on festive collections. Code <code>HOLI50</code>.</p>
<ul>
  <li>One of six festival/seasonal starting templates offered in the campaign composer; every field remains editable before sending.</li>
  <li>Campaigns are standalone records — the discount code isn't auto-validated against checkout, it's informational copy for the email.</li>
</ul>`,
  },
  "campaign-newyear": {
    icon: "🎉",
    tag: "Campaign Template",
    title: "New Year Bonanza",
    body: `<p>Extra 25% savings. Code <code>NEWYEAR25</code>.</p>
<ul>
  <li>A ready-made seasonal template in the campaign composer, editable before dispatch like every other template here.</li>
  <li>Bulk-sent to the active user set resolved at send time, via the same dual-protocol SMTP engine used for order emails.</li>
</ul>`,
  },
  "campaign-independence": {
    icon: "🎉",
    tag: "Campaign Template",
    title: "Independence Day Special",
    body: `<p>Grand discounts across top brands. Code <code>INDIA77</code>.</p>
<ul>
  <li>Pre-configured copy and discount code that Admin/Manager can adjust before the campaign goes out.</li>
  <li>Stored in the same <code>campaigns</code> table as every other campaign — no separate "holiday campaign" model.</li>
</ul>`,
  },
  "campaign-eid": {
    icon: "🎉",
    tag: "Campaign Template",
    title: "Eid Celebration Offer",
    body: `<p>Special savings for the family. Code <code>EIDMUBARAK</code>.</p>
<ul>
  <li>Another of the pre-configured seasonal starting points in <code>CampaignForm.tsx</code>.</li>
  <li>Sending re-resolves the active recipient list at dispatch time rather than snapshotting it when the campaign is created.</li>
</ul>`,
  },
  "campaign-eos": {
    icon: "🎉",
    tag: "Campaign Template",
    title: "End of Season Clearance",
    body: `<p>Last-chance seasonal pricing.</p>
<ul>
  <li>A non-festival template for general clearance pushes, with no fixed discount code baked in.</li>
  <li>Like the other templates, it's just a starting draft — every field is editable before the campaign is sent.</li>
</ul>`,
  },
  "chart-revenue": {
    icon: "📊",
    tag: "Visualization",
    title: "Revenue Trajectory",
    body: `<p>Line chart with area gradient over the monthly trend series.</p>
<ul>
  <li>Rendered as dependency-free inline SVG directly from <code>GET /api/reports/analytics-summary</code>'s monthly trend array — no charting library is loaded.</li>
  <li>The area gradient is purely presentational; the underlying values are the same figures used in the period sales reports.</li>
</ul>`,
  },
  "chart-category": {
    icon: "📊",
    tag: "Visualization",
    title: "Category Performance",
    body: `<p>Horizontal bar chart of spend per category.</p>
<ul>
  <li>A horizontal bar per category, scaled to the highest-spend category in the current result set.</li>
  <li>Driven by a SQL <code>GROUP BY</code> on category — zero customer PII passes through this endpoint.</li>
</ul>`,
  },
  "chart-lifecycle": {
    icon: "📊",
    tag: "Visualization",
    title: "Order Lifecycle Breakdown",
    body: `<p>Segmented proportional bar across order statuses.</p>
<ul>
  <li>A single segmented bar proportionally showing the Pending / Processing / Shipped / Delivered / Cancelled split.</li>
  <li>Reflects current order status counts, not a historical timeline.</li>
</ul>`,
  },
  "chart-paymentmix": {
    icon: "📊",
    tag: "Visualization",
    title: "Payment Method Mix",
    body: `<p>Proportional distribution across UPI, Card, Net Banking, COD, Wallet.</p>
<ul>
  <li>Proportional distribution across UPI, Card, Net Banking, COD and Wallet, aggregated in SQL from the <code>payments</code> table.</li>
  <li>Included in the same <code>analytics-summary</code> payload as the other three charts on this page, so all four stay in sync.</li>
</ul>`,
  },
  "portal-admin": {
    icon: "💻",
    tag: "Portal",
    title: "Admin Console",
    body: `<p>Everything under <code>/</code>: <code>AdminLayout</code> wraps Dashboard, Users, Products, Categories, Orders, Payments, Refunds, Shipping, Couriers, Communications, Campaigns, Reports, Analytics, Profile — gated by <code>ProtectedRoute allowedRoles={["Admin","Manager","Staff"]}</code>, redirecting to <code>/login</code>.</p>
<ul>
  <li>All 14 screens share one <code>AdminLayout</code> shell (nav, header, role-aware menu) rather than each owning its own chrome.</li>
  <li>Every write action rendered here is re-validated server-side by <code>@roles_required(...)</code> — hiding a button is UX only, never the actual security boundary.</li>
</ul>`,
  },
  "portal-storefront": {
    icon: "🛍️",
    tag: "Portal",
    title: "Storefront",
    body: `<p>Everything under <code>/shop</code>: <code>StorefrontLayout</code> wraps Home, Product Detail, and Cart (public); Checkout, My Orders, Account and Wishlist are gated by <code>ProtectedRoute allowedRoles={["Customer"]}</code>, redirecting to <code>/shop/login</code>.</p>
<ul>
  <li>Home, Product Detail and Cart are public; Checkout, My Orders, Account and Wishlist require a signed-in <code>Customer</code>, redirecting to <code>/shop/login</code> otherwise.</li>
  <li>Shares the exact same <code>AuthContext</code> / JWT mechanism as the Admin Console — just a different allowed-roles list.</li>
</ul>`,
  },
};
