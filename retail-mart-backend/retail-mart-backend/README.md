# Retail Mart Backend (Week 2 - API Development)

Flask + SQLAlchemy REST API built to plug directly into the Week-2 React
frontend (`retail-mart-week2-final`) and aligned with `Retail_Mart_ERD.pdf`.

Covers everything on the tracker for Sorav's row 16-17:
- JWT authorization & authentication
- Product catalog (Products, Categories)
- Orders (with status workflow + history)
- Payments (with status workflow + history)
- Receipts
- Shipments / Delivery (with status workflow + tracking history)
- A ready-to-import Postman collection for testing every endpoint

## 1. Setup

```bash
cd retail-mart-backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit if needed (DB, secrets, CORS origin)
python seed.py                  # creates tables + loads sample data
python run.py                   # runs on http://localhost:4000
```

Health check: `GET http://localhost:4000/api/health`

By default this runs on **SQLite** (zero setup, file `retail_mart.db`).
To use MySQL instead (matching the ERD's target database), set in `.env`:

```
DATABASE_URL=mysql+pymysql://<user>:<password>@localhost:3306/retail_mart
```

then run `pip install -r requirements.txt` (PyMySQL is already included)
and `python seed.py` again against the empty MySQL database. See
`schema_mysql_reference.sql` for the equivalent hand-written DDL, useful for
comparing against the ERD - you don't need to run it yourself, SQLAlchemy
creates the tables from `app/models/`.

## 2. Wiring up the frontend

The frontend already has a placeholder API layer for exactly this
(`src/services/api/client.ts`, `.env.example`'s `VITE_API_BASE_URL`). Once
this backend is running:

1. In the frontend repo, set `VITE_API_BASE_URL=http://localhost:4000/api`
   in `.env`.
2. Implement `request()` in `src/services/api/client.ts` with `fetch()`,
   attaching `Authorization: Bearer <token>` from wherever the app stores
   the token after login.
3. Swap each page's `mockX` import for the matching function in
   `src/services/api/*.ts` (`fetchProducts`, `fetchOrders`, etc.) - no
   other component code needs to change, because every model's `to_dict()`
   in `app/models/` was written to match `src/types/*.ts` field-for-field.

## 3. Auth

- `POST /api/auth/register` - self-service sign up (defaults to role `Staff`)
- `POST /api/auth/login` - returns `{ accessToken, user }`
- `GET /api/auth/me` - current user (send `Authorization: Bearer <token>`)

Every other endpoint requires that Bearer token. Role gates:
`Admin` > `Manager` > `Staff` (see each blueprint in `app/routes/` for the
exact `@roles_required(...)` on each route).

Seeded roles and test accounts (see `seed.py` for initialization):

| Email | Role |
|---|---|
| gautam@retailmart.dev | Admin |
| sorav@retailmart.dev | Admin |
| neha.joshi@retailmart.dev | Manager |
| rohit.desai@retailmart.dev | Manager |
| farah.khan@retailmart.dev | Staff |
| ananya.rao@example.com (phone +919876543210) | Customer |

## 4. Endpoints

| Resource | Routes |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Users | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/<id>`, `PATCH /api/users/<id>/status` |
| Categories | `GET/POST /api/categories`, `GET/PUT/DELETE /api/categories/<id>` |
| Products | `GET/POST /api/products` (supports `?category=`, `?status=`, `?search=`), `GET/PUT/DELETE /api/products/<id>` |
| Orders | `GET/POST /api/orders` (supports `?status=`, `?paymentStatus=`), `GET/DELETE /api/orders/<id>`, `PATCH /api/orders/<id>/status`, `PATCH /api/orders/<id>/payment-status`, `GET /api/orders/<id>/invoice` (PDF) |
| Payments | `GET/POST /api/payments` (supports `?status=`, `?orderId=`), `GET /api/payments/<id>`, `PATCH /api/payments/<id>/status`, `GET /api/payments/<id>/receipt` (PDF), `POST /api/payments/razorpay/order`, `POST /api/payments/razorpay/verify` |
| Receipts | `GET /api/receipts` (supports `?orderId=`), `POST /api/receipts` (only for a `Paid` payment) |
| Shipments | `GET/POST /api/shipments` (supports `?status=`, `?orderId=`), `GET /api/shipments/<id>`, `PATCH /api/shipments/<id>/status` |
| Dashboard | `GET /api/dashboard/summary` |
| Campaigns | `GET/POST /api/campaigns` (supports `?status=`), `GET/PUT/DELETE /api/campaigns/<id>`, `POST /api/campaigns/<id>/send` |
| Communications | `POST /api/communications/send`, `POST /api/communications/orders/<id>/confirmation` |
| Reports | `GET /api/reports/<daily\|monthly\|yearly>` |
| Analytics | `GET /api/analytics/projections`, `GET /api/analytics/ai-projections` (both support `?period=`, `?periodsAhead=`) |
| Auth (storefront) | `POST /api/auth/signup`, `POST /api/auth/otp/request`, `POST /api/auth/otp/verify` |
| Addresses | `GET/POST /api/addresses`, `PUT/DELETE /api/addresses/<id>` (all scoped to the logged-in Customer) |
| My Orders | `GET /api/orders/mine` (Customer-scoped order history) |

Order status workflow (`PATCH /api/orders/<id>/status`) enforces the exact
same transitions as `ORDER_STATUS_TRANSITIONS` in the frontend's
`src/types/order.ts`:

```
Pending -> Processing | Cancelled
Processing -> Shipped | Cancelled
Shipped -> Delivered
Delivered / Cancelled -> (terminal)
```

Shipment status workflow (`PATCH /api/shipments/<id>/status`) is
sequential:

```
Pending -> Packed -> Shipped -> Out for Delivery -> Delivered
```

Marking a shipment `Shipped` or `Delivered` auto-advances its parent
order's status too, if that transition is legal for the order.

### PDF downloads (invoices & receipts)

- `GET /api/orders/<id>/invoice` streams a generated PDF invoice for that
  order. Works regardless of the order's status.
- `GET /api/payments/<id>/receipt` streams a generated PDF receipt.
  Requires the payment's status to be `Paid` (409 otherwise). The
  underlying `Receipt` row (see `RECEIPTS` in the ERD) is created
  automatically on first download if one doesn't already exist - no
  separate "generate receipt" step is needed.

Both are implemented in `app/utils/pdf.py` with `reportlab` and returned
via Flask's `send_file`, with `Content-Disposition: attachment` so
browsers download rather than navigate to them. Note that
`app/__init__.py` explicitly exposes the `Content-Disposition` header over
CORS (`expose_headers=["Content-Disposition"]`) - without that, browser
JS on the frontend's origin cannot read the suggested filename from a
cross-origin response, even though the header is present on the wire.

### Week 3: RazorPay, Email, Reports, Analytics, Campaigns

All five features below are optional-by-default and degrade gracefully so
the app works out of the box, with real integration always being an
env-var change rather than a code change:

- **RazorPay** (`app/utils/razorpay_client.py`): `POST /payments/razorpay/order`
  creates a RazorPay order for an existing Payment; `POST
  /payments/razorpay/verify` checks the signature and, on success, marks
  the Payment `Paid` through the *same* code path `PATCH
  /payments/<id>/status` uses - so receipts, invoices, and the parent
  order's `paymentStatus` all keep working with no extra code. Without
  `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` set, a mock client simulates
  RazorPay's API well enough to exercise the full checkout flow in dev.
  Talks to RazorPay's REST API directly with `requests` rather than the
  official `razorpay` PyPI package - that SDK hard-imports `pkg_resources`
  at import time, which breaks on newer Python/setuptools combinations
  with no fix needed on your end; hand-rolling the one POST + one HMAC
  check RazorPay's docs specify sidesteps it entirely.
- **Email** (`app/utils/email.py`): one `send_email(to, subject, body)`
  function used for order confirmations, campaign blasts, and the generic
  `POST /communications/send`. Without `SMTP_HOST` set, emails are logged
  to the console instead of sent.
- **Reports** (`app/utils/reports.py`): `GET /reports/<daily|monthly|yearly>`
  is one route backed by one aggregation function - grouping happens in
  Python after a single query (not dialect-specific SQL), so the same code
  runs unmodified on SQLite and MySQL. O(n) time, O(k) memory (k = number
  of periods).
- **Analytics/Projections** (`app/utils/projections.py`): `GET
  /analytics/projections` fits a plain least-squares trendline over the
  report data above (no numpy needed). `GET /analytics/ai-projections`
  calls the same function and, if `GEMINI_API_KEY` is set, asks Gemini
  for a short narrative on top of the same numbers; otherwise it falls
  back to a templated summary. There's exactly one place forecasting math
  lives - the AI endpoint never recomputes it.
- **Campaigns** (`app/models/campaign.py`, `app/routes/campaigns.py`): CRUD
  that deliberately mirrors Categories' shape, plus `POST
  /campaigns/<id>/send` which emails every active user via the same
  `send_email()` used everywhere else.

To turn on real email, RazorPay, or AI narratives later, set the
corresponding variables in `.env` (see `.env.example`) - nothing in
`app/routes/` or `app/utils/` needs to change.

### Week 4: Customer signup, mobile OTP, customer-facing endpoints

Introduces a `"Customer"` role alongside Admin/Manager/Staff, and a set of
endpoints scoped to *whichever* customer is logged in - used by the
frontend's storefront (see that project's README).

- **Signup** - `POST /auth/signup` (email + password, optional phone).
  Shares one `_create_account()` helper (in `app/routes/auth.py`) with the
  admin console's `/auth/register` and the OTP flow below, so every
  account-creation path stays consistent.
- **Mobile OTP** (`app/utils/sms.py`) - `POST /auth/otp/request` generates
  a 6-digit code and texts it via Twilio if configured, otherwise **logs
  it to the console** (same graceful-degradation pattern as email/
  RazorPay/AI). `POST /auth/otp/verify` checks the code and either logs in
  the existing user with that phone or auto-creates a new Customer account
  for it - one endpoint covers both OTP login and OTP signup. Codes are
  single-use and expire after 10 minutes (`OTP_TTL_MINUTES`).
- **Addresses** (`app/models/address.py`) - a full CRUD address book,
  every route scoped to `get_jwt_identity()` so one customer can never see
  or edit another's addresses.
- **My Orders** - `GET /orders/mine` filters by the new `Order.user_id`
  column (nullable, so existing admin-created orders are unaffected).
  `POST /orders` now stamps `user_id` from the JWT automatically, so a
  storefront checkout and an admin's manual order entry both flow through
  the exact same endpoint. Order invoice downloads now check ownership: a
  Customer can only download their own order's invoice (403 otherwise).
- The admin console's `GET /users` now excludes `Customer` accounts (one
  query filter) so that page stays about admin-panel access, not
  shoppers - customers view/edit their own info via `/auth/me` and
  `/addresses` instead.

### Week 4.1: Product images, checkout-time RazorPay, automatic receipt emails

- **Product images** - `Product.imageUrl` (nullable). `POST`/`PUT
  /products` accept an `imageUrl`; `seed.py` fills every seeded product
  with a stable placeholder photo (`picsum.photos`, seeded by SKU so it's
  the same on every reseed) - swap for real product photography via the
  admin Products form's "Image URL" field at any time.
- **RazorPay now fires at checkout, not after.** `POST /orders` creates a
  `Payment` row (status `"Pending"`) alongside every order and returns its
  id as `paymentId` - the storefront's checkout immediately hands that id
  to `POST /payments/razorpay/order` / `/verify`. `GET/POST
  /orders` and `/orders/mine` all include `paymentId` in their response
  now, so a "Pay Now" retry is always one field away if checkout's inline
  payment is abandoned. The RazorPay endpoints now also accept the
  `Customer` role (previously Admin/Manager/Staff only) with an ownership
  check (`_is_payment_owner`) so a customer can only pay for their own
  order.
- **Automatic receipt emails** - `app/utils/email.py`'s `send_email()`
  gained an `attachments` parameter. `_email_receipt()` in
  `app/routes/payments.py` builds the same receipt PDF `GET
  /payments/<id>/receipt` streams and emails it to the order's
  `customer_email` the moment a payment succeeds - called from both `PATCH
  /payments/<id>/status` (admin marks Paid) and `POST
  /payments/razorpay/verify` (RazorPay payment succeeds), so it fires
  regardless of which path the payment went through. Best-effort: a failed
  send is logged, never blocks the response.

### Week 4.2: RazorPay without the SDK, and a hard-timeout AI projection

- **RazorPay no longer depends on the `razorpay` PyPI package.**
  `app/utils/razorpay_client.py` now talks to RazorPay's REST API
  directly via `requests` (one `POST /v1/orders` with Basic Auth, plus the
  existing hand-rolled HMAC signature check) instead of importing the
  official SDK. That SDK hard-imports `pkg_resources` at module load time,
  which breaks with `ModuleNotFoundError` on newer Python/setuptools
  combinations that don't ship it by default - a perfectly correctly
  configured setup could crash for reasons unrelated to anything in this
  codebase. `requirements.txt` no longer lists `razorpay`.
- **AI projections can no longer hang the request.** `app/utils/projections.py`'s
  `ai_projection()` now runs the Gemini call in a worker thread with a
  hard wall-clock deadline (`GEMINI_TIMEOUT_SECONDS`, default 15s) via
  `concurrent.futures`, on top of the SDK's own `request_options` timeout
  - the SDK-level timeout alone was observed to not be honored under some
  network conditions (a fully blocked/unreachable connection can hang
  well past it). If Gemini is slow, unreachable, or the key/model is
  invalid, the endpoint now reliably falls back to the statistical
  narrative within ~17 seconds instead of hanging indefinitely, and the
  real failure reason is logged (`current_app.logger.exception`/`.error`)
  instead of being silently swallowed - check the server console if
  `aiGenerated` keeps coming back `false` with a real key configured.
  `GEMINI_MODEL` is also now configurable via env var in case
  `"gemini-2.0-flash"` isn't available for your key/tier.

## 5. Testing via Postman

Import `postman/Retail-Mart-Backend.postman_collection.json`. Run **Auth ->
Login** first - its test script saves the returned token into the
collection's `accessToken` variable, and every other request is already
configured to send it as a Bearer token.

## 6. Project layout

```
app/
  __init__.py        # application factory, blueprint registration
  config.py          # env-driven config (SQLite by default, MySQL-ready)
  extensions.py       # db, jwt singletons
  models/            # SQLAlchemy models, one file per ERD cluster
  routes/            # one blueprint per resource
  utils/
    decorators.py     # @roles_required(...) RBAC guard
    ids.py            # generates the frontend's "p-1001" / "ORD-58421" style IDs
seed.py               # creates tables + loads data matching the frontend's old mocks
run.py                # dev server entrypoint
schema_mysql_reference.sql  # DDL reference matching Retail_Mart_ERD.pdf
postman/              # Postman collection (task: "Test All Rest API Functionality via PostMan")
```

## 7. ID strategy (why PKs are strings, not the ERD's ints)

`Retail_Mart_ERD.pdf` uses integer surrogate keys everywhere. This API
instead uses the frontend's human-readable string IDs (`"p-1001"`,
`"ORD-58421"`, `"PAY-90211"`, `"SHP-77001"`, `"u-001"`, `"c-01"`) as the
actual primary keys. This is a deliberate simplification for Week 2:
it lets every model's JSON response match `src/types/*.ts` exactly with no
mapping layer, so the React pages need zero changes beyond swapping mock
imports for API calls. `schema_mysql_reference.sql` documents this so it's
easy to compare directly against the ERD during review.

## 8. Known simplifications vs the full ERD

To fit what the Week-1/2 frontend actually renders, this API does **not**
yet implement: multi-variant products, multi-warehouse inventory, carts,
promotions, wallets, refunds, returns, sellers/marketplace tables, reviews,
notifications, support tickets, or audit logs. Those all exist in
`Retail_Mart_ERD.pdf` for a later phase; the models here (`Users`,
`Categories`, `Products`, `Orders`/`OrderItems`, `Payments`, `Receipts`,
`Shipments`) are the subset the current UI (`ProductsPage`, `OrdersPage`,
`PaymentsPage`, `ShippingPage`, `UsersPage`, `CategoriesPage`,
`DashboardPage`) needs to go live.
