# Retail Mart — Admin Console

## Purpose

This is the frontend for Retail Mart, a retail e-commerce admin console. It
covers the frontend scope assigned to Gautam (Frontend Developer): project
setup, routing, the admin layout, and UI for Dashboard, Products,
Categories, Orders, Payments, and Shipping.

As of Week 2, this project is wired up to the real `retail-mart-backend`
(Flask + JWT + SQLAlchemy, built by Sorav) — see "Backend integration"
below for how to run both together. It started as a Week-1 mock-data-only
foundation; the mock data files under each feature's `data/` folder are now
kept only as fixtures for the test suite (see "Test").


## Tech stack

- React 18 + TypeScript
- Vite (dev server / build)
- Tailwind CSS (utility-first styling, no UI component framework)
- React Router v6 (client-side routing)
- ESLint + Prettier (linting / formatting)
- Vitest + React Testing Library (component tests)

No UI framework (MUI, Ant Design, Bootstrap, etc.) is used. Every visual
component is built from Tailwind + plain React.

## Features implemented in Week 1

- Vite + React + TypeScript project scaffolding
- Tailwind CSS configured with a custom color/typography token system
- Centralized routing (`/dashboard`, `/products`, `/categories`, `/orders`,
  `/payments`, `/shipping`, plus a 404 page and a `/` → `/dashboard` redirect)
- Real JWT login at `/login` and a **protected-route guard**
  around the entire admin area (see "Authentication" below)
- Responsive Admin Layout: fixed sidebar on desktop, slide-in drawer on mobile
- Dashboard with summary cards, recent orders, and inventory/payment/shipping
  summaries (all derived from mock data)
- Products, Categories, Orders, Payments, and Shipping management screens,
  each with search, status filtering, a data table, status badges, and an
  empty state
- A small reusable UI library: `Button`, `Input`, `Select`, `SearchInput`,
  `Badge`, `StatusBadge`, `Card`, `Table`, `PageHeader`, `EmptyState`,
  `ErrorState`, `LoadingState`, `Modal`
- Responsive design from 320px mobile up through large desktop, with
  horizontally-scrollable tables and column hiding on small screens instead
  of a page-level horizontal scrollbar
- A lightweight, clearly-marked-as-placeholder `services/api` layer ready for
  Sorav's backend
- A small test suite for the two most reused UI components (`Button`,
  `StatusBadge`)

## Design decisions (not specified in the brief)

Where the brief left a decision open, these choices were made and are called
out here rather than presented as requirements:

- **Color system**: a navy/teal palette (`ink-*`, `brand-*` in
  `tailwind.config.js`) instead of a default palette, to read as a distinct,
  professional internal tool rather than a generic template. Amber, green,
  and red are used sparingly for warning/success/danger states only.
- **Typography**: Inter for all UI text. A single, highly-legible typeface
  is intentional for a data-dense enterprise admin tool — this is not the
  place for expressive display type.
- **Currency/date formatting**: `Intl.NumberFormat`/`Intl.DateTimeFormat`
  with `en-IN`/INR, since the mock customer data and project context are
  India-based. Swap the locale/currency in `src/utils/format.ts` if this is
  wrong for the real business.
- **No global state library**: each page holds its own filter state with
  `useState`. There's no cross-page shared state yet, so Redux/Zustand/etc.
  would be premature.

## Authentication

Real JWT authentication against the `retail-mart-backend` Flask API:

```
/login  →  POST /api/auth/login  →  JWT stored in sessionStorage  →  /dashboard
```

- **Seeded accounts** live in the backend's `seed.py` (see that project's
  README for role structures):
  - Admin: `admin@retailmart.dev`
  - Customer: `customer@example.com`
- `src/features/auth/AuthContext.tsx` provides `isAuthenticated`,
  `currentUser`, `login()`, and `logout()`. `login()` calls
  `POST /api/auth/login` and stores the returned JWT.
- `src/features/auth/authStorage.ts` persists the JWT in `sessionStorage`
  so refreshing the page doesn't log the user out. On mount, if a token is
  found, `AuthContext` calls `GET /api/auth/me` to re-hydrate
  `currentUser`; an expired/invalid token is cleared automatically.
- `src/components/auth/ProtectedRoute.tsx` guards every route nested under
  `AdminLayout` in `src/app/router.tsx`. If there's no token, it redirects
  to `/login` and remembers the page the user was trying to reach (via
  router `state`), so a successful login sends them back there instead of
  always landing on `/dashboard`.
- The header's "Sign out" button calls `logout()`, which clears the token
  and redirects to `/login`.
- Role gating (`Admin` / `Manager` / `Staff`) is enforced **server-side**
  by the backend's `@roles_required(...)` decorators — the frontend does
  not re-implement authorization logic, it just reflects `currentUser.role`
  in the UI (e.g. hiding actions) and surfaces 403s from the API.

No customer/user-facing panel is built — this login screen and protected
route only guard the **admin** area.

## Project structure

```
src/
├── app/                  # App shell + centralized router
│   ├── App.tsx           # Wraps the router in AuthProvider + ToastProvider
│   └── router.tsx
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx   # Redirects to /login when not authenticated
│   ├── common/             # Cross-feature building blocks:
│   │                       #   NavIcon, ManagementToolbar, ConfirmDialog, ToastProvider
│   ├── layout/             # Sidebar, Header, MobileNavDrawer, ProfileMenu (accessible dropdown)
│   └── ui/                 # Design system: Button, Table, Badge, Card, Input,
│                           #   Select, Textarea, StatusBadge, Modal, etc.
├── constants/
│   ├── roles.ts             # Fixed Week-2 role list (Admin/Manager/Staff)
│   └── routes.ts            # Single source of truth for route paths + nav config
├── features/
│   ├── auth/                 # AuthContext (real JWT login/me), useAuth, sessionStorage token helper
│   ├── dashboard/           # Dashboard-specific components + mock summary data
│   ├── users/                # data, services/userRepository, useUsers hook,
│   │                         #   components/ (UserForm, RoleSelect)
│   ├── products/             # data, services/productRepository, useProducts hook,
│   │                         #   components/ProductForm
│   ├── categories/           # data + getCategoryOptions() (reused by ProductForm)
│   ├── orders/                # data, services/orderRepository (status transitions), useOrders hook
│   ├── payments/              # data, services/paymentRepository (isRefund/listPayments/listRefunds),
│   │                         #   usePayments hook, components/PaymentsTabs
│   └── shipping/              # data (incl. trackingHistory), services/shipmentRepository,
│                             #   useShipments hook (async loading/error shape)
├── hooks/
│   ├── useDisclosure.ts     # Open/close state (mobile drawer, modal, profile menu)
│   ├── useOnClickOutside.ts # Closes a menu/popover on outside click
│   └── useToast.ts          # Consumes ToastProvider's context
├── layouts/
│   └── AdminLayout.tsx      # Sidebar + header + content shell
├── pages/                    # One page component per route, including the
│                             #   *DetailsPage screens, RefundsPage, and ProfilePage
├── services/
│   ├── api/                  # Placeholder API client + per-feature fetch functions (unchanged)
│   └── createInMemoryRepository.ts  # Generic mock CRUD factory used by the Week-2 repositories
├── styles/
│   └── index.css             # Tailwind entry point
├── test/
│   └── setup.ts              # Vitest + jest-dom setup
├── types/                     # Domain types: User, Role, Product, Category, Order,
│                              #   OrderItem, Payment, Shipment (incl. tracking/status history events)
├── utils/                     # cn(), formatCurrency(), formatDate(), validation.ts
├── main.tsx
└── vite-env.d.ts
```

This is a **feature-oriented** structure: domain types and mock data live
next to (or under) the feature they belong to, while the shared UI kit,
layout, and routing stay generic and framework-level. Nothing here uses more
files than it needs — for example, each management page is a single file
because its logic (search + filter + table) is genuinely simple enough to
read in one place.

## Installation

Requires Node.js 18+ and npm.

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts the Vite dev server (default: http://localhost:5173).

## Build

```bash
npm run build
```

Type-checks with `tsc -b` and produces a production build in `dist/`.

## Preview a production build

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Format

```bash
npm run format        # writes formatting fixes
npm run format:check  # checks formatting without writing (useful in CI)
```

## Test

```bash
npm run test
```

Runs the Vitest suite (currently: `Button` and `StatusBadge` component tests).

## Routing structure

| Path                | Page                         | Protected                   |
| ------------------- | ---------------------------- | --------------------------- |
| `/login`            | LoginPage                    | No (public)                 |
| `/`                 | Redirects to `/dashboard`    | Yes                         |
| `/dashboard`        | DashboardPage                | Yes                         |
| `/users`            | UsersPage (Week 2)           | Yes                         |
| `/users/:id`        | UserDetailsPage (Week 2)     | Yes                         |
| `/products`         | ProductsPage                 | Yes                         |
| `/products/:id`     | ProductDetailsPage (Week 2)  | Yes                         |
| `/categories`       | CategoriesPage               | Yes                         |
| `/orders`           | OrdersPage                   | Yes                         |
| `/orders/:id`       | OrderDetailsPage (Week 2)    | Yes                         |
| `/payments`         | PaymentsPage (Week 2)        | Yes                         |
| `/payments/refunds` | RefundsPage (Week 2)         | Yes                         |
| `/payments/:id`     | PaymentDetailsPage (Week 2)  | Yes                         |
| `/shipping`         | ShippingPage (Week 2)        | Yes                         |
| `/shipping/:id`     | ShipmentDetailsPage (Week 2) | Yes                         |
| `/profile`          | ProfilePage (Week 2)         | Yes                         |
| `*`                 | NotFoundPage (404)           | Yes (inside the admin tree) |

"Protected" means the route is nested under `ProtectedRoute` in
`src/app/router.tsx` and redirects to `/login` when there's no valid JWT.
See "Authentication" above for how that works.

All routes are defined once in `src/app/router.tsx`, referencing path
constants from `src/constants/routes.ts`. Sidebar navigation is generated
from the same `NAV_ROUTES` list, so a new route only needs to be added in
one place.

## Mock data (now test fixtures only)

`src/features/*/data/*.ts` still exist as static arrays, but they are no
longer used by the running app — every page now fetches from the backend
(see "Backend integration" below). These files are kept because the test
suite's fake API (`src/test/mockApi.ts`) seeds itself from them, so the
data displayed in tests still matches what `retail-mart-backend`'s
`seed.py` loads for real.

## Backend integration — done

This is now wired up to the real `retail-mart-backend` (Flask + JWT), not
mock data:

1. `src/services/api/client.ts` calls the backend via `fetch()`, attaching
   the JWT from `src/features/auth/authStorage.ts` on every request.
2. Every feature (`products`, `categories`, `orders`, `payments`,
   `shipping`, `users`, `dashboard`) has a repository + hook
   (`useProducts`, `useOrders`, etc.) that fetches from the API with
   `isLoading`/`error` state, rendered via the existing
   `LoadingState`/`ErrorState` components.
3. `src/features/auth/AuthContext.tsx` calls `POST /api/auth/login` and
   `GET /api/auth/me`, storing the JWT in `sessionStorage`.
4. `client.ts`'s `downloadFile()` handles the two PDF endpoints
   (`GET /orders/<id>/invoice`, `GET /payments/<id>/receipt`): it fetches
   the file as a blob and triggers a normal browser download, rather than
   navigating away from the page. "Invoice" buttons appear on
   `OrdersPage`/`OrderDetailsPage`; "Receipt" buttons appear on
   `PaymentsPage`/`PaymentDetailsPage` only for `Paid` payments (matching
   the backend's rule that a receipt requires a completed payment).

### Week 3: Campaigns, Reports, Analytics, RazorPay

- **Campaigns** (`src/features/campaigns/`, `CampaignsPage.tsx`) is a full
  CRUD screen that deliberately mirrors `ProductsPage`/`CategoriesPage` -
  same repository/hook shape, same Table/Modal/ConfirmDialog components -
  plus a "Send" action that calls `POST /campaigns/<id>/send` and reports
  how many customers were emailed.
- **Reports** (`ReportsPage.tsx`) is one page with a period selector
  (Daily/Monthly/Year End) driving one endpoint
  (`GET /reports/<period>`), rendered with the existing generic `Table`
  component - no charting library was introduced since a table already
  answers "how much did we sell and when" without extra weight.
- **Analytics** (`AnalyticsPage.tsx`) shows sales history plus a forecast,
  with a toggle between "Statistical" (`GET /analytics/projections`) and
  "AI Projection" (`GET /analytics/ai-projections`) - both return the same
  shape (`SalesProjection`), so the page doesn't care which one is active
  beyond an optional `narrative` field the AI endpoint adds.
- **RazorPay checkout** (`src/features/razorpay/useRazorpayCheckout.ts`) is
  a single hook used from `PaymentDetailsPage`'s "Pay Now" button. It reads
  the `live` flag the backend returns: in mock mode (default, no RazorPay
  account configured) it skips loading RazorPay's script entirely and
  verifies immediately, so the whole flow is testable in dev; in live mode
  it loads RazorPay's real checkout widget. The RazorPay script tag is
  cached at module scope so it's only ever injected once per page load.

### Week 4: Customer signup, mobile OTP, and a Flipkart/Amazon-style storefront

A second portal, `/shop/*`, sharing the same JWT/`AuthContext` as the admin
console but with its own layout and its own login:

- **`StorefrontLayout.tsx`** replaces the admin sidebar with a top nav
  (logo, search bar, cart icon with a live item-count badge, account
  menu) - the consumer-shopping shell, reusing `ProfileMenu`/`Button`
  rather than building parallel versions of either.
- **Browsing** (`ShopHomePage.tsx`, `ShopProductDetailPage.tsx`,
  `ProductCard.tsx`) calls the *same* `fetchProducts`/`fetchCategories`/
  `fetchProduct` used by the admin console - no separate "storefront
  product API" exists, because the backend's product endpoints were
  already public.
- **Cart** (`src/features/cart/CartContext.tsx`) is deliberately
  client-side only (`localStorage`), not a backend resource - no Cart/
  CartItem model or endpoints were added. This is the "least code"
  choice: checkout is the *only* place the cart touches the network, via
  one `POST /orders` call built from the cart's items, matching the
  admin's existing order-creation endpoint exactly.
- **Checkout** (`CheckoutPage.tsx`) picks or adds a delivery address
  (`src/features/addresses/`, reused again on `AccountPage.tsx`'s address
  book), places the order, then immediately collects payment via the
  same `useRazorpayCheckout` hook the admin console uses (see Week 4.1
  below) before redirecting to My Orders.
- **My Orders** (`MyOrdersPage.tsx`) calls the new customer-scoped
  `GET /orders/mine` and reuses `downloadOrderInvoice` from the admin
  console's order services unchanged. Also offers a "Pay Now" retry
  (same `useRazorpayCheckout` hook) for any order whose checkout-time
  payment didn't complete.
- **Account** (`AccountPage.tsx`) shows the profile from `currentUser`
  (already in `AuthContext`) plus full address-book CRUD.
- **Auth**: `SignupPage.tsx` (email+password) and `CustomerLoginPage.tsx`
  (email/password tab **and** a Mobile OTP tab: request code → enter code
  → signed in) are deliberately separate from the admin console's
  `LoginPage.tsx`, to avoid any regression risk to its existing tests.
  `AuthContext` gained `signup()`, `requestOtp()`, and `verifyOtp()`
  alongside the existing `login()` - same token-storage code path for all
  four. `login()` now resolves the signed-in user (not just a boolean) so
  both login pages can redirect by role - see Week 4.1's bug fix below.
- **`ProtectedRoute`** gained an optional `redirectTo` prop (defaults to
  the admin `/login`) so the exact same guard component protects both
  `/shop/checkout|orders|account` (→ `/shop/login`) and the admin routes
  (→ `/login`) - one component, one behaviour, two destinations.

### Week 4.1: Product images, checkout-time RazorPay

- **Product images**: `Product.imageUrl` (nullable) renders as a real
  `<img>` in `ProductCard.tsx`, `ShopProductDetailPage.tsx`, the admin
  Products table, and `ProductDetailsPage.tsx` - falling back to the
  existing letter-tile placeholder when a product has no image set.
  `ProductForm.tsx` gained an "Image URL" field.
- **RazorPay now fires at checkout**, not from a separate payment page.
  `Order` gained a `paymentId` field (the backend creates a `Payment`
  alongside every order); `CheckoutPage.handlePlaceOrder` calls
  `useRazorpayCheckout` immediately after `POST /orders` succeeds, using
  that id. If payment doesn't complete, the order is still placed and a
  "Pay Now" button appears on `MyOrdersPage` to retry with the exact same
  hook.

### Week 4.2: Fixing the "Customer sign-in lands on the admin dashboard" bug

The first attempt at this fix (making `login()` return the signed-in user
instead of a `boolean`, so redirects could be role-aware) turned out to be
incomplete - it missed the actual root cause:

- **Root cause**: visiting the bare `/` while signed out hits the admin's
  `ProtectedRoute`, which redirects to `/login` with `state: { from:
  location }` - and `location.pathname` there is `"/"`, a perfectly
  truthy string. The old redirect logic was `from?.pathname ?? fallback`,
  so that truthy `"/"` silently *overrode* the role-based fallback,
  sending a newly-signed-in Customer to `"/"` → the admin dashboard
  redirect, regardless of their role.
- **The real fix**: `src/features/auth/postLoginRedirect.ts` exports one
  function, `getPostLoginRedirect(role, requestedFrom)`, used by both
  `LoginPage.tsx` and `CustomerLoginPage.tsx`. It only honors
  `requestedFrom` when that path actually belongs to the same portal as
  the signed-in role (a `/shop/*` path for `Customer`, anything else for
  Admin/Manager/Staff) - otherwise it falls back to `/shop` or
  `/dashboard`. Covered by `postLoginRedirect.test.ts`, including the
  exact "`from: '/'`" regression case.
- **`ProtectedRoute` now actually checks roles**, not just authentication.
  It gained an optional `allowedRoles` prop; if the signed-in user's role
  isn't in the list, they're redirected via `getPostLoginRedirect` instead
  of rendering content (and hitting a wall of backend 403s) they can't
  use. Wired up in `router.tsx`: the admin tree requires
  `["Admin","Manager","Staff"]`, and `/shop/checkout|orders|account`
  requires `["Customer"]` - so an Admin account wandering into checkout is
  sent back to `/dashboard` instead of erroring on `GET /addresses`
  (Customer-only on the backend), and a Customer hitting an admin URL
  directly (bookmark, typed URL) is sent to `/shop` instead of rendering
  admin content.

Browsing and the cart are public (`/shop`, `/shop/product/:id`,
`/shop/cart`); checkout, order history, and account require sign-in **as
a Customer** specifically.


**To run it:** start `retail-mart-backend` (see its README — `python
seed.py && python run.py`, defaults to `http://localhost:4000`), then set
`VITE_API_BASE_URL` in this project's `.env` (copy `.env.example`) and run
`npm run dev`. Sign in with any seeded account (e.g. `admin@retailmart.dev`).

The test suite (`npm test`) doesn't need the backend running — it uses an
in-memory fake API (`src/test/mockApi.ts`) that mirrors the real backend's
routes and business rules (e.g. `ORDER_STATUS_TRANSITIONS`), installed
globally in `src/test/setup.ts`.

## Responsive design notes

- Tested down to 320px width; the sidebar is hidden below the `lg` breakpoint
  (1024px) and replaced by a `MobileNavDrawer` opened from the header's menu
  button.
- Every management table lives inside its own `overflow-x-auto` container
  (`Table.tsx`), so a wide table scrolls within itself — the page body never
  gets a horizontal scrollbar.
- Lower-priority table columns (SKU, category, method, tracking number, etc.)
  are hidden below `sm`/`md`/`lg` using each column's `hideBelow` option,
  rather than shrinking all columns until they're unreadable.
- Summary cards on the dashboard reflow from 1 column (mobile) → 2 (tablet)
  → 4 (desktop) with CSS grid.
- Toolbar rows (search + filter + action) stack vertically on mobile and sit
  in a row from `sm` up.

## Future scope (beyond Week 1)

- Real authentication and RBAC (Authorization Management module)
- Connecting each page to Sorav's real API and removing the mock data files
- Real create/edit forms for Products and Categories (the `Modal` component
  is already in place for this)
- Order detail / payment detail / shipment detail views
- Inventory and shipping provider integrations
- A broader test suite as real business logic (not just UI) is added

## Suggested Git commit sequence

1. `chore: initialize frontend project`
2. `feat: configure tailwind styling`
3. `feat: add admin layout`
4. `feat: add application routing`
5. `feat: add dashboard page`
6. `feat: add product management UI`
7. `feat: add category management UI`
8. `feat: add order management UI`
9. `feat: add payment management UI`
10. `feat: add shipping management UI`
11. `feat: improve responsive design`
12. `chore: add linting and formatting`
13. `test: add component tests for Button and StatusBadge`
14. `docs: add project README`
15. `feat: add frontend-only demo login and protected admin routes`
16. `test: add login -> protected dashboard flow tests`
17. `docs: document Week-1 demo authentication`

## Week-1 completion checklist

- [x] React + TypeScript + Vite project set up and building cleanly
- [x] Tailwind CSS configured with a custom token system
- [x] React Router routing centralized in one file
- [x] Frontend-only demo login (`/login`) with hardcoded demo credentials
- [x] Protected-route guard around the entire admin area
- [x] Responsive Admin Layout (desktop sidebar / mobile drawer)
- [x] Dashboard UI with mock summary data
- [x] Products management UI
- [x] Categories management UI
- [x] Orders management UI
- [x] Payments management UI
- [x] Shipping management UI
- [x] Reusable UI component library
- [x] Domain TypeScript types for all five entities
- [x] Mock data separated from presentation components
- [x] Placeholder `services/api` layer, not a fake backend
- [x] ESLint + Prettier configured and passing
- [x] `npm run build` succeeds with no errors
- [x] No page-level horizontal overflow at 320px–1440px+
- [x] Empty states on every management screen
- [x] Component tests passing (UI kit + login → protected dashboard flow)

Not in Week 1 (by design): **real** backend authentication, RBAC, a real
database, payment gateway integration, courier integration, order
processing. The `/login` screen and route guard were a frontend demo only
at the time — see "Authentication" above for the current, real
implementation.

## Week 2 Implementation

Week 2 upgrades the Week-1 static screens into workflow-oriented management
tools, and adds a full Users module. Everything below is a **frontend
workflow over in-memory mock data** — nothing is persisted to a real
database, and no real backend endpoints are called. See "Mock/API boundary"
below for exactly where the line sits and how it will move once Sorav's
backend is ready.

### Week-2 scope

Per the project plan, Gautam's Week-2 frontend responsibility covers **Admin,
Users, Products, Orders, and Payments**. Shipping & Tracking is explicitly a
Week-3 deliverable and was **not** expanded — the Week-1 Shipping screen is
untouched and still works exactly as it did.

### User workflow

- **New module**: `/users` (list) and `/users/:id` (details).
- `UsersPage`: search by name/email, filter by role, filter by status, table
  with Edit / Deactivate-Activate / Delete row actions, and an "Add User"
  button.
- Add and Edit both use the same `UserForm` component (in a `Modal`),
  with validation (`utils/validation.ts`): name required, email required
  and must look like an email. Errors render inline under each field.
- `RoleSelect` is one reusable dropdown used both in the form and as the
  page's role filter (`src/features/users/components/RoleSelect.tsx`),
  backed by the fixed role list in `src/constants/roles.ts`.
- Delete goes through the shared `ConfirmDialog` — nothing destructive
  happens on a single click.
- Every create/update/delete/status-change shows a toast
  ("User created successfully.", "User deactivated.", etc.) instead of
  `alert()`.
- `UserDetailsPage` shows the full profile, and offers the same Edit /
  Deactivate / Delete actions from a dedicated screen.
- Data flow: `UsersPage`/`UserDetailsPage` → `useUsers()` hook →
  `userRepository` (in-memory) → _(future)_ `services/api/users.ts` → Sorav's
  backend.

### Product workflow

- Existing `/products` upgraded to a full CRUD workflow; new `/products/:id`
  details page added.
- `ProductForm` (add/edit, in a `Modal`) fields: name, SKU, category
  (pulled from the existing Categories mock data via
  `getActiveCategoryOptions()` — no duplicate category list), description,
  price, stock quantity, status. Validation: name/SKU/category required,
  price must be a positive number, stock must be a non-negative whole
  number.
- Delete requires confirmation via `ConfirmDialog`.
- Data flow: `ProductsPage`/`ProductDetailsPage` → `useProducts()` hook →
  `productRepository` (in-memory) → _(future)_ `services/api/products.ts`.

### Order workflow

- Existing `/orders` now links each row to a new `/orders/:id` details page
  instead of being a dead-end table.
- `OrderDetailsPage` shows order items with line totals, customer name and
  email, current order + payment status, and a full status history timeline.
- **Status transitions are rule-based**, not free-form: the allowed next
  statuses from any given status live in one place,
  `ORDER_STATUS_TRANSITIONS` in `src/types/order.ts` (e.g. `Pending` →
  `Processing` or `Cancelled`; `Shipped` → `Delivered` only; `Delivered` and
  `Cancelled` are final states with no further transitions). The details
  page only ever offers buttons for statuses that are actually allowed.
- `orderRepository.updateStatus()` re-validates the transition itself before
  mutating anything, so the rule is enforced in one place even if a caller
  bypassed the UI.
- Status changes go through `ConfirmDialog` and show a toast on success or
  failure.
- Data flow: `OrdersPage`/`OrderDetailsPage` → `useOrders()` hook →
  `orderRepository` (in-memory, transition-aware) → _(future)_
  `services/api/orders.ts`.

### Payment workflow

- Existing `/payments` now links each row to a new `/payments/:id` details
  page.
- `PaymentDetailsPage` shows the order reference (with a link to that
  order's details page), customer, amount, method, date, current status,
  and a status history timeline.
- The only mutating action is **"Mark as refunded"**, offered only when a
  payment's status is `Paid`, and only after a `ConfirmDialog` confirmation.
  This is explicitly _not_ a real refund — no payment gateway is called.
- Data flow: `PaymentsPage`/`PaymentDetailsPage` → `usePayments()` hook →
  `paymentRepository` (in-memory) → _(future)_ `services/api/payments.ts`.

### Admin (dashboard) workflow

- The dashboard gained a **Quick Links** row (Manage Users / Manage Products
  / View Orders / View Payments) so the admin's module hierarchy is visible
  from the landing page, not just the sidebar.
- Added an "Active Users" summary card alongside the existing
  product/order/payment/shipment summaries.
- Recent orders on the dashboard are now clickable and go straight to that
  order's details page.
- The Week-1 layout itself (sidebar, header, responsive drawer) was **not**
  redesigned — only extended, per the brief's instruction not to
  unnecessarily rework a working layout.

### RBAC preparation

The broader project includes a real Authorization Management / RBAC module
that Sorav's backend will own. Week 2 prepares the frontend for that without
building a fake security layer:

- `AuthContext` now exposes a `currentUser` object (`{ name, email, role }`)
  alongside `isAuthenticated`. The header displays the signed-in user's name,
  email, and role badge.
- `RoleSelect` and the fixed `Admin` / `Manager` / `Staff` role list
  (`src/constants/roles.ts`) exist so role assignment has a real UI, ready to
  be pointed at backend-provided roles later.
- **What this is not**: hiding a button based on `currentUser.role` would
  _look_ like access control but would not _be_ access control — anyone can
  edit client-side JavaScript. Nothing in this codebase hides functionality
  for security reasons based on the demo role, and no such logic should be
  added until the backend actually enforces authorization on every request.
  The frontend's job is to _display_ roles and _collect_ role selections;
  enforcing them is Sorav's backend's job. This distinction is documented
  directly in `src/features/auth/AuthContext.tsx`.

### Mock/API boundary

Week 2 introduces a second, small layer that Week 1 didn't need:

- `src/services/createInMemoryRepository.ts` — a generic `list/getById/
create/update/remove` factory over an in-memory array. Each feature wraps
  it: `userRepository`, `productRepository`, `orderRepository` (adds
  `updateStatus`), `paymentRepository` (adds `markRefunded`).
- Each feature also has a `use*` hook (`useUsers`, `useProducts`,
  `useOrders`, `usePayments`) that owns the React state and is what pages
  actually import — pages never touch a repository directly.
- This is **separate from** `src/services/api/*`, which is the Week-1
  placeholder layer representing Sorav's _future real_ backend contract (and
  still throws if called - nothing calls it).

The intended migration path once Sorav's APIs exist:

```
Page → use*Hook → mockRepository        (Week 2, today)
Page → use*Hook → services/api/*Service → real backend  (future)
```

Only the inside of each `use*` hook needs to change — swap the repository
call for a `services/api/*` call (and add loading/error handling using the
existing `LoadingState`/`ErrorState` components). No page, form, or table
component needs to change.

### Testing

28 tests total (10 carried over from Week 1, 18 new for Week 2):

- `UserForm.test.tsx` — required-field and email validation, successful
  submit, cancel.
- `ProductForm.test.tsx` — required-field validation, price must be
  positive, successful submit with numeric coercion.
- `UsersPage.test.tsx` — renders seeded users, search filters the list,
  empty state appears for no matches, role filter works.
- `orderRepository.test.ts` — valid forward transition records history;
  invalid transitions (skipping a step, changing a final-state order) are
  rejected; unknown order id is handled.
- `paymentRepository.test.ts` — refunding a Paid payment works and records
  history; refunding a non-Paid payment is rejected; unknown payment id is
  handled.

All Week-1 tests (`Button`, `StatusBadge`, the login → protected dashboard
flow) continue to pass unmodified.

### Responsive behavior

All new screens follow the existing Week-1 responsive rules — no new
patterns were introduced:

- Details pages (`UserDetailsPage`, `ProductDetailsPage`, `OrderDetailsPage`,
  `PaymentDetailsPage`) use the same `grid-cols-1 lg:grid-cols-3` layout as
  the dashboard, stacking to a single column below `lg`.
- Forms (`UserForm`, `ProductForm`) stack fields to one column on narrow
  screens and use `sm:grid-cols-2` / `sm:grid-cols-3` only where there's
  room, so the `Modal` never causes horizontal scrolling on a 320px screen.
- The dashboard's new Quick Links row uses the same
  `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` pattern as the existing
  summary cards.
- Toasts are pinned to the bottom of the viewport and capped at
  `max-w-sm`, so they never cause horizontal overflow on mobile.

### Known limitations

- All Week-2 data (users, product edits, order status changes, payment
  refunds) lives in memory for the current browser tab and **resets on
  page refresh** — there is no backend to persist it to yet.
- The demo login always represents one fixed user (`Gautam Sharma`,
  role `Admin`); there's no way to log in as a Manager or Staff user to see
  a different `currentUser.role` in the header, since Week 2 doesn't
  implement multiple demo accounts or real authentication.
- Role selection has no effect on what the UI allows a user to do — see
  "RBAC preparation" above for why that's intentional at this stage.
- Order status transitions and the payment refund action are the only
  mutating "business rule" behaviors implemented; there's no inventory
  deduction, notification sending, or audit logging, since none of that was
  in the Week-2 scope.

### Backend integration status

Done — see the top-level "Backend integration" section for how it's wired
up. `src/services/api/*.ts` call the real backend, every `use*` hook
(`useUsers`, `useProducts`, `useOrders`, `usePayments`, `useShipments`,
`useCategories`) has `isLoading`/`error` state rendered via
`LoadingState`/`ErrorState`, and `AuthContext` gets the current user from
`GET /api/auth/me` rather than a hardcoded constant. The `data/*.ts` mock
arrays remain only as fixtures for the test suite's fake API (see "Test").

## Mentor feedback corrections

Two issues were raised after reviewing the Week-2 build. Both are fixed;
here's exactly what changed and why.

### 1. Payments vs Refunds were not separated

**Problem**: refunded transactions showed up as just another status inside
the normal Payments list and its status filter.

**Fix**: Payments and Refunds are now genuinely separate views, not a CSS
trick hiding rows:

- `paymentRepository.ts` exports a single canonical `isRefund(payment)`
  predicate, plus `listPayments()` (excludes refunds) and `listRefunds()`
  (refunds only) built on it.
- `usePayments()` derives `payments` and `refunds` from one reactive state
  array using that same predicate, so the two lists can never drift apart
  or go stale relative to each other after a refund action.
- `PaymentsPage` (`/payments`) now renders only `payments`, and its status
  filter dropdown no longer offers "Refunded" as an option (options are
  now: All statuses, Pending, Paid, Failed).
- A new `RefundsPage` (`/payments/refunds`) renders only `refunds`, with
  refund-specific columns: Refund/Payment ID, Order ID, Customer, Refund
  amount, Original payment method, Refund date (read from the payment's
  history, not its original transaction date), and status.
- `PaymentsTabs` (`src/features/payments/components/PaymentsTabs.tsx`) is a
  small segmented-nav component using real `NavLink`s between the two
  routes, so the split has a real, shareable, back/forward-able URL rather
  than being in-memory UI state.
- `PaymentDetailsPage` still shows any payment regardless of status (via
  `usePayments().allPayments`) since a refunded payment should still be
  viewable — but its "Back" button now returns to Refunds instead of
  Payments when the payment being viewed is a refund.
- No real refund/payment gateway was implemented or implied — "Mark as
  refunded" still only flips a mock record's status, exactly as before.

### 2. The "G" avatar didn't do anything

**Problem**: the circular avatar next to Sign out was a plain `<div>` with
no click handler.

**Fix**: `src/components/layout/ProfileMenu.tsx` replaces it with a real
`<button>` that opens an accessible dropdown:

- `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls` on the
  trigger button; the panel itself uses `role="menu"` / `role="menuitem"`.
- Opens on click, using the same `useDisclosure()` hook the mobile nav
  drawer already uses (no new open/close state pattern introduced).
- Closes on outside click via a new, generic `useOnClickOutside` hook
  (`src/hooks/useOnClickOutside.ts`) - reusable by any future
  dropdown/popover, not special-cased to this menu.
- Closes on <kbd>Escape</kbd> and returns focus to the trigger button, the
  same pattern `Modal.tsx` already used for its own Escape handling.
- The panel is `right`-aligned and capped at `max-w-[calc(100vw-2rem)]`, so
  it can't cause horizontal overflow even at a 320px viewport.
- The menu shows the signed-in demo user's name, email, and role badge
  (from the existing `useAuth()` — no second auth/user state system was
  introduced), plus two actions: **My Profile** (navigates to a new,
  simple `/profile` page) and **Sign out** (calls the same `logout()` that
  the old standalone button called).
- The old separate "Sign out" text button next to the avatar was removed,
  since Sign out now lives in the menu the avatar opens — this was a
  deliberate consolidation, not a removal of functionality; the header
  still shows the user's name/email/role for a quick glance without
  opening the menu.

## Shipping & Tracking (Week 2)

The project task tracker lists Shipping & Tracking as a Week-2 Gautam
responsibility (not Week 3 as an earlier scope note assumed), so the
Week-1 static Shipping screen has been upgraded the same way Orders and
Payments were:

- `Shipment` gained a `trackingHistory: ShipmentStatusEvent[]` field
  (mirroring Orders' `statusHistory` and Payments' `history`), so a
  tracking timeline has real data to render.
- A new `ShipmentDetailsPage` (`/shipping/:id`) shows the order reference
  (linked to that order's details page), customer, courier, tracking
  number, expected delivery, current delivery status, and the full
  tracking history timeline.
- `ShippingPage` now links each row to its details page instead of a dead
  "View" button, and both pages go through `useShipments()`.
- **`useShipments()` is intentionally written in an async shape** —
  `isLoading` / `error` / data — unlike the other Week-2 feature hooks
  (`useUsers`, `useProducts`, `useOrders`, `usePayments`), which are
  synchronous since they only read a plain in-memory array. Shipping's
  hook wraps its mock read in a resolved `Promise` and renders the
  existing `LoadingState`/`ErrorState` components while "loading" and on
  failure. This exists to demonstrate, in one module, the exact hook shape
  the other modules will need once they're switched from repositories to
  real `services/api/*` calls — see "API integration status" below.
- No shipment mutation (status update, carrier reassignment, etc.) was
  implemented — the acceptance criteria for Shipping don't call for one,
  unlike Orders' status-transition workflow.

## API integration status

**No real backend API contracts, base URLs, or endpoint documentation were
supplied as part of this project.** Per the backend boundary in the brief,
nothing here invents endpoints or claims to call a real API. Concretely:

| Module   | Data source today                                               | Ready for real API?                                                                                                                                              |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users    | `userRepository` (in-memory mock)                               | Yes — swap inside `useUsers()`; `services/api/*` has no `users.ts` yet, add one following the existing pattern                                                   |
| Products | `productRepository` (in-memory mock)                            | Yes — swap inside `useProducts()`; `services/api/products.ts` placeholder exists                                                                                 |
| Orders   | `orderRepository` (in-memory mock)                              | Yes — swap inside `useOrders()`; `services/api/orders.ts` placeholder exists                                                                                     |
| Payments | `paymentRepository` (in-memory mock)                            | Yes — swap inside `usePayments()`; `services/api/payments.ts` placeholder exists                                                                                 |
| Shipping | `shipmentRepository`, wrapped in `useShipments()`'s async shape | Yes — swap the body of `useShipments()`'s `load()` for `services/api/shipping.ts`'s `fetchShipments()`; the hook's return shape and every consumer stay the same |

Every `services/api/*.ts` file's functions now call the real
`retail-mart-backend` (see `services/api/client.ts`). This section is kept
for history; at the time it was written these were placeholders that threw
if called, so an accidental early call would fail loudly instead of
silently returning fake data.

## Week-2 acceptance criteria — audit

| Requirement (from the project tracker)                                                                                                                      | Status                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Admin: dashboard, navigation, admin actions, loading/error/empty states                                                                                     | Done — Quick Links, summary cards, `LoadingState`/`ErrorState`/`EmptyState` used throughout |
| Users: list/search/filter/add/edit/view/activate-deactivate/delete/role                                                                                     | Done                                                                                        |
| Products: list/search/filter/add/edit/view/delete/category/price/stock/status/validation                                                                    | Done                                                                                        |
| Orders: list/search/filter/details/items/customer/payment info/status/history/valid transitions                                                             | Done                                                                                        |
| Payments: list/search/filter/details/status/history                                                                                                         | Done                                                                                        |
| Payments vs Refunds clearly separated                                                                                                                       | Done — see "Mentor feedback corrections" above                                              |
| Refunds: separate view, refund amount, order ref, customer, refund info, status/history                                                                     | Done                                                                                        |
| Shipping & Tracking: list/search/filter/details/order ref/customer/carrier/tracking #/status/delivery status/history timeline/loading-error-empty/API-ready | Done                                                                                        |
| Profile menu: semantic button, opens/closes correctly, shows name/email/role, Profile + Sign out actions                                                    | Done                                                                                        |
| Real backend API integration                                                                                                                                | **Not done** — no API contracts were supplied; see "API integration status" above           |

## Tests added for this round of fixes

18 new tests on top of the 43 that already existed (61 total):

- `ProfileMenu.test.tsx` (5) — closed by default, opens on click and shows
  account info, closes on outside click, closes on Escape, Sign out works.
- `PaymentsRefundsSeparation.test.tsx` (4) — Payments excludes refunded
  transactions, the status filter no longer offers "Refunded", Refunds
  shows only refunded transactions, the Refunds page is clearly labeled.
- `ShippingPage.test.tsx` (4) — loading state renders before data resolves,
  the seeded list renders after, search filters the list, empty state
  shows for no matches.
- `ShipmentDetailsPage.test.tsx` (2) — renders shipment info and its full
  tracking history once loaded, shows a not-found state for an unknown id.

All 43 pre-existing tests (Week 1 + earlier Week 2) continue to pass
unmodified.

## Important files to understand before presenting to your trainer

1. `src/app/router.tsx` — how every route is defined, how `/login` stays
   public while everything else sits behind `ProtectedRoute`, and how the
   Week-2 `:id` detail routes are wired up.
2. `src/features/auth/AuthContext.tsx` — the frontend-only demo login logic,
   the `currentUser`/role shape for RBAC prep, and the code comments
   explaining exactly what to replace when real backend authentication is
   ready.
3. `src/components/auth/ProtectedRoute.tsx` — how unauthenticated visitors
   get redirected to `/login` and sent back to where they were headed.
4. `src/services/createInMemoryRepository.ts` — the generic mock CRUD
   factory every Week-2 feature repository is built on.
5. `src/features/orders/services/orderRepository.ts` and
   `src/types/order.ts`'s `ORDER_STATUS_TRANSITIONS` — the order
   status-transition rule, and how the UI only ever offers valid next
   statuses.
6. `src/features/users/useUsers.ts` and `src/pages/UsersPage.tsx` — the
   clearest example of the Week-2 page → hook → repository pattern, plus
   search/filter/add/edit/delete all in one readable page.
7. `src/features/users/components/UserForm.tsx` (or `ProductForm.tsx`) —
   how validation and inline error messages work.
8. `src/components/common/ConfirmDialog.tsx` and
   `src/components/common/ToastProvider.tsx` — the shared confirmation and
   feedback patterns reused across every destructive/mutating action.
9. `src/components/ui/Table.tsx` — the one generic table every management
   page uses, including how column hiding works.
10. `src/components/ui/StatusBadge.tsx` — the status → color mapping shared
    by users, products, orders, payments, and shipments.
11. `src/services/api/client.ts` — the placeholder pattern for _real_
    backend integration (distinct from the Week-2 mock repositories), and
    why it intentionally throws if called.
12. `src/features/payments/services/paymentRepository.ts` (`isRefund`,
    `listPayments`, `listRefunds`) and `src/pages/RefundsPage.tsx` — the
    Payments/Refunds separation the mentor asked for.
13. `src/components/layout/ProfileMenu.tsx` and
    `src/hooks/useOnClickOutside.ts` — the accessible dropdown pattern
    (open/close/outside-click/Escape) fixing the dead avatar button.
14. `src/features/shipping/useShipments.ts` — the async-shaped hook
    (loading/error state) that shows what the other feature hooks will
    look like once they call real APIs instead of mock repositories.
15. `tailwind.config.js` — the custom color and font tokens behind every
    class name in the app.

## What to say if your trainer asks "Why did you structure it this way?"

The structure separates three concerns that change at different rates:
**routing** (`app/`, `constants/routes.ts`) rarely changes once set;
**presentation** (`components/ui`, `layouts`) is reused across every screen
and should stay generic; and **domain/feature logic** (`features/`, `pages/`,
`types/`) is specific to Products, Orders, etc. and will grow the most as the
backend comes online. Keeping mock data inside `features/*/data/` means
swapping it for a real API call later is a one-line change per page, not a
rewrite of any component.

## Questions a senior frontend developer may ask during code review

- Why is filter/search state local to each page instead of in a shared
  store? (Because nothing is shared across pages yet — introducing global
  state now would be premature.)
- Why does `Table` take a `hideBelow` per column instead of a separate
  mobile card layout? (Simpler for Week 1's dataset; a card layout is a
  reasonable follow-up if tables grow much wider.)
- Why does `services/api/client.ts` throw instead of returning mock data?
  (So an accidental real call fails loudly during development instead of
  silently substituting fake data.)
- Why is there no global error boundary yet? (Out of scope per the brief —
  Week 1 explicitly avoids a complicated global error system; `ErrorState`
  exists as the building block for when one is added.)
- Why two separate mock/service layers (`services/api/*` and the Week-2
  `features/*/services/*Repository.ts`)? (`services/api/*` is a placeholder
  for the _real_ future backend contract and is never called. The Week-2
  repositories are working in-memory CRUD used to actually demonstrate the
  add/edit/delete/status-change workflows today. They get replaced/removed
  at different times — see "Future backend integration" in the Week 2
  section.)
- Why is the order status transition rule a data map
  (`ORDER_STATUS_TRANSITIONS`) instead of an if/else chain? (So the UI, the
  repository, and any future backend validation can all reference the same
  source of truth instead of three copies of the same logic potentially
  drifting apart.)
- Why doesn't the app hide the "Delete" button for non-Admin roles? (Because
  that would be fake security — client-side hiding doesn't stop anyone from
  calling the underlying function directly. Real authorization has to be
  enforced by the backend on every request; see "RBAC preparation.")
