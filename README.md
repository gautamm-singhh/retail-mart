# Retail Mart

Retail Mart is an enterprise-grade full-stack retail and e-commerce management platform designed to unify customer-facing storefront operations with back-office logistics, order fulfillment, and executive business intelligence. Combining a high-performance React frontend and a robust Flask REST microservice backed by MySQL, the system orchestrates the complete retail lifecycle—from product browsing, multi-tenant customer wishlists, and payments to automated courier AWB generation, real-time shipment milestone tracking, transactional notifications, and AI-assisted financial forecasting.

---

### Live Deployments

- **Web Storefront & Admin Portal:** [https://retail-mart-frontend.vercel.app](https://retail-mart-frontend.vercel.app)
- **Production Backend Service:** [https://retail-mart-iota.vercel.app](https://retail-mart-iota.vercel.app)
- **REST API Endpoint Base:** [https://retail-mart-iota.vercel.app/api](https://retail-mart-iota.vercel.app/api)

---

## Overview

Retail Mart delivers an integrated retail operating environment that bridges consumer shopping with enterprise management:

- **Customer Shopping Experience:** Fluid storefront browsing, catalog search, category filtering, cart management, seamless checkout, and account portals.
- **Product & Category Catalog:** Hierarchical product classification, multi-attribute catalog records, active/draft inventory states, and dynamic pricing.
- **Cart & Checkout:** Real-time cart state calculation, tax and shipping estimation, address selection, and automated order creation.
- **Customer Wishlist:** High-performance customer wishlist with persistent MySQL storage and strict tenant isolation.
- **Order Management:** Multi-state order lifecycle (`Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`) with automated status transition events.
- **Payment Processing:** Multi-rail payment handling (UPI, Cards, Net Banking, COD), payment status reconciliation, and automated downloadable PDF receipts.
- **Shipping & Fulfillment:** End-to-end logistics coordination linking orders to shipments, automated courier partner assignment, and delivery scheduling.
- **Courier Management:** Centralized registry of logistics partners (Bluedart, Delhivery, Ekart, DTDC, FedEx) with automated AWB generation.
- **Transactional Communications:** Automated email delivery triggered by order and shipment state changes, supported by dual SSL/STARTTLS SMTP protocol handlers.
- **Promotional Marketing Campaigns:** Template-driven seasonal and festive marketing campaigns with promotional code configuration.
- **Executive Analytics & Reporting:** Database-aggregated business performance metrics with complete customer PII protection.
- **AI-Assisted Revenue Forecasting:** Hybrid predictive engine combining statistical Holt-Winters time-series modeling with Gemini 1.5 Pro executive narrative analysis strictly formatted in Indian Rupees (₹ / INR).
- **Role-Based Operations:** Tiered access control model governing `Admin`, `Manager`, `Staff`, and `Customer` privilege domains.

---

## Key Features

### Customer Experience
- **Product Catalog Browsing:** Search, categorize, and inspect detailed product specifications and stock levels.
- **Product Details & Ratings:** Visual product showcases, real-time inventory indicators, and customer review metrics.
- **Shopping Cart & Checkout:** Persistent client-side cart synchronization with automated totals calculation.
- **Multi-Tenant Wishlist:** Instant item bookmarking with database persistence and guaranteed customer data isolation.
- **Customer Account Portal:** Dedicated customer dashboard displaying total spend, order volume, and items purchased.
- **Purchase Summary & Customer Appreciation:** Personalized KPI telemetry summarizing historical customer transactions.
- **Customer Order History:** Complete timeline view of past purchases with instant status indicators.
- **Self-Service Shipment Tracking:** Real-time visibility into active deliveries with carrier checkpoint milestones.

### Operations Management
- **User & Access Management:** Comprehensive user administration with role assignment (`Admin`, `Manager`, `Staff`, `Customer`).
- **Product Catalog Administration:** Full CRUD operations for products, SKU management, stock adjustments, and price overrides.
- **Category Hierarchy Management:** Dynamic category tree creation, slug configuration, and departmental grouping.
- **Order Lifecycle Administration:** Operational fulfillment tools to process, cancel, review, and print order invoices.
- **Payment Auditing & Refunds:** Separation of completed transactions from refunds, with receipt verification.
- **Courier Partner Registry:** Configuration of supported carriers, contact details, and dynamic tracking URL templates.
- **Shipment Management & Automated AWBs:** Automatic generation of standard carrier-compliant tracking numbers (AWBs) and live checkpoint synchronization.

### Communications & Marketing
- **Lifecycle Transactional Emails:** Automated triggers for account registration, order confirmation, payment receipt, and shipment status changes (`Packed`, `Shipped`, `Out for Delivery`, `Delivered`).
- **Standardized Email Engine:** Dual SMTP security support for SSL (Port 465) and STARTTLS (Port 587) with fail-safe logging in development.
- **Promotional Campaigns:** Pre-built festival and seasonal marketing campaign templates with discount code tracking.

### Analytics & Intelligence
- **Executive KPI Dashboard:** Real-time financial telemetry covering gross revenue, net revenue, average order value (AOV), and fulfillment rates.
- **Interactive Visualizations:** Pure SVG charts (line trajectories, category volume bars, order lifecycle distributions, payment method breakdowns).
- **Periodic Business Reports:** Aggregated analytical rollups across Daily, Monthly, and Annual operational windows.
- **AI Revenue Forecasting:** Automated 30/60/90-day predictive projections combining econometric statistical algorithms with Gemini 1.5 Pro narrative synthesis strictly in Indian Rupees (₹).

---

## Architecture

```
+-------------------------------------------------------------+
|               React 18 + TypeScript + Vite                  |
|  - Customer Storefront & Account Portal                     |
|  - Operations Admin Console & Order Lifecycle Manager       |
|  - Executive KPI Visualizations & Campaign Management       |
+-------------------------------------------------------------+
                              |
                     REST API over HTTPS
                 JWT Bearer Token Authorization
                              v
+-------------------------------------------------------------+
|                Python 3.10 + Flask Microservice             |
|  - Modular Blueprint Routing (/api/*)                       |
|  - Role-Based Access Control Guards                         |
|  - External Carrier Adapter & Tracking Normalizer           |
|  - SMTP Transactional Email Engine (SSL / STARTTLS)         |
|  - Aggregation Engine (PII-Protected Reports)               |
|  - Statistical Holt-Winters & Gemini AI Forecasting Engine  |
+-------------------------------------------------------------+
                              |
                        SQLAlchemy ORM
                        PyMySQL Driver
                              v
+-------------------------------------------------------------+
|                     MySQL 8.0 Database                      |
|  17 Normalized Tables: users, roles, addresses, categories, |
|  products, orders, order_items, order_status_events,       |
|  couriers, shipments, shipment_status_events, payments,     |
|  receipts, campaigns, wishlists                             |
+-------------------------------------------------------------+
```

### External Integrations
- **Logistics & Courier Providers:** TrackingMore API, Ship24 API, and Carrier Sandbox AWB Adapter.
- **Transactional Mail Services:** Standard SMTP gateway compatible with Gmail SMTP, SendGrid, Amazon SES, or Microsoft 365.
- **Payment Processing:** Payment reconciliation framework with Razorpay order verification hooks and automated PDF receipt generation.
- **AI & Analytics Services:** Google Gemini 1.5 Pro API integration for automated executive financial projections.

---

## Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend Framework** | React 18 | Declarative component-based UI architecture |
| **Language (Client)** | TypeScript 5.5 | Strict static typing and interface verification |
| **Build & Dev Tool** | Vite 5.4 | High-speed ESM-based development and production bundler |
| **Styling** | Tailwind CSS 3.4 | Curated enterprise color palette and responsive tokens |
| **Client Routing** | React Router v6 | Client-side routing with deep-link SPA rewrites and role guards |
| **Backend Framework** | Python 3.10 + Flask 3.0 | Lightweight, modular Python REST application |
| **Authentication** | Flask-JWT-Extended 4.6 | Cryptographic JWT signing and claims verification |
| **ORM & Database** | SQLAlchemy 2.0 + PyMySQL | High-performance relational schema abstraction |
| **Database** | MySQL 8.0 | Production relational database (with SQLite local fallback) |
| **Client Testing** | Vitest + Testing Library | 14 test suites, 53 automated frontend unit/integration tests |
| **Server Testing** | Python test suites | Comprehensive end-to-end business and verification suites |
| **Cloud Hosting** | Vercel | Decoupled serverless Python runtime and static asset CDN |

---

## Project Structure

```text
retail-mart/
├── README.md                                          # Root project documentation
├── DOCUMENTATION.md                                   # Comprehensive functional & system specification
│
├── retail-mart-frontend-connected/
│   └── retail-mart-week2-final/                       # Frontend application root
│       ├── src/
│       │   ├── app/                                   # Router, navigation, and top-level providers
│       │   ├── components/                            # UI primitives (Buttons, Cards, Modals, Badges, Charts)
│       │   ├── constants/                             # API routes and navigation definitions
│       │   ├── features/                              # Domain-driven feature modules
│       │   │   ├── auth/                              # Authentication context, login handlers, role guards
│       │   │   ├── campaigns/                         # Campaign builder and template components
│       │   │   ├── orders/                            # Order management workflows and repositories
│       │   │   ├── payments/                          # Payment history and receipt services
│       │   │   ├── products/                          # Catalog listings, search, and editing modals
│       │   │   ├── shipping/                          # Courier dispatch, shipment tracking timelines
│       │   │   ├── users/                             # User administration and role management
│       │   │   └── wishlist/                          # Customer wishlist context and state hooks
│       │   ├── pages/                                 # Storefront and operations admin views
│       │   ├── services/                              # Centralized HTTP client and API integration layer
│       │   └── types/                                 # Shared TypeScript data models and interfaces
│       ├── package.json                               # Frontend dependencies and scripts
│       ├── tailwind.config.js                         # Custom design token configuration
│       ├── vercel.json                                # SPA deep-link rewrite rules
│       └── vite.config.ts                             # Vite configuration and path aliases
│
└── retail-mart-backend/
    └── retail-mart-backend/                           # Backend application root
        ├── api/
        │   └── index.py                               # Vercel serverless entrypoint bridge
        ├── app/
        │   ├── __init__.py                            # Application factory and blueprint registration
        │   ├── config.py                              # Environment configuration and CORS settings
        │   ├── extensions.py                          # Database and JWT extension instances
        │   ├── models/                                # SQLAlchemy domain entities (17 models)
        │   ├── routes/                                # REST API route controllers
        │   └── utils/                                 # Email, reports, projections, and tracking adapters
        ├── pyproject.toml                             # Project package metadata
        ├── requirements.txt                           # Production Python dependencies
        ├── run.py                                     # Local development server entrypoint
        ├── seed.py                                    # Initial database seeder
        ├── test_verification.py                       # Automated E2E verification test suite
        └── vercel.json                                # Backend serverless routing configuration
```

---

## API Modules

The backend exposes a structured RESTful API under the `/api` namespace:

| Module | Route Prefix | Key Endpoints | Description |
|---|---|---|---|
| **Authentication** | `/api/auth` | `/login`, `/register`, `/signup`, `/me` | Identity verification, JWT token issuance, customer signup |
| **Users** | `/api/users` | `GET/POST /api/users`, `PUT/DELETE /api/users/<id>` | User administration, status activation, role governance |
| **Products** | `/api/products` | `GET/POST /api/products`, `PUT/DELETE /api/products/<id>` | Catalog search, SKU filtering, inventory maintenance |
| **Categories** | `/api/categories` | `GET/POST /api/categories`, `PUT/DELETE /api/categories/<id>` | Department and category hierarchy management |
| **Orders** | `/api/orders` | `GET/POST /api/orders`, `PATCH /api/orders/<id>/status` | Order placement, state workflow transitions, invoice downloads |
| **Payments** | `/api/payments` | `GET/POST /api/payments`, `POST /api/payments/razorpay/*` | Multi-rail payments, transaction audit, receipt retrieval |
| **Shipments** | `/api/shipments` | `GET/POST /api/shipments`, `GET /api/shipments/<id>/track` | Shipment lifecycle, live carrier checkpoints, status sync |
| **Couriers** | `/api/couriers` | `GET/POST /api/couriers`, `PUT/DELETE /api/couriers/<id>` | Logistics partner directory, active state toggles |
| **Customer Stats**| `/api/customer` | `GET /api/customer/stats/summary` | Customer order telemetry and lifetime value metrics |
| **Wishlist** | `/api/wishlist` | `GET/POST /api/wishlist`, `DELETE /api/wishlist/<id>` | Isolated customer item bookmarking and persistence |
| **Communications**| `/api/comms` | `POST /api/comms/send`, `GET /api/comms/smtp-status` | Transactional email dispatch, SMTP health diagnostics |
| **Reports** | `/api/reports` | `GET /api/reports/daily`, `GET /api/reports/monthly` | PII-safe aggregated revenue and operational metrics |
| **Analytics** | `/api/analytics` | `GET /api/analytics/projections`, `/ai-projections` | Statistical forecasting and Gemini AI narrative in INR |
| **Campaigns** | `/api/campaigns` | `GET/POST /api/campaigns`, `POST /api/campaigns/<id>/send` | Seasonal marketing campaigns and discount codes |
| **Addresses** | `/api/addresses` | `GET/POST /api/addresses`, `PUT/DELETE /api/addresses/<id>` | Customer shipping address book management |

---

## Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- MySQL 8.0 (or local SQLite)

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd retail-mart-backend/retail-mart-backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env     # Windows
# cp .env.example .env     # macOS/Linux

# Populate database schema and seed data
python seed.py

# Launch backend development server on http://localhost:4000
python run.py
```

Verify backend health:
```bash
curl http://localhost:4000/api/health
```

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd retail-mart-frontend-connected/retail-mart-week2-final

# Install dependencies
npm install

# Configure environment variables
# Ensure VITE_API_BASE_URL resolves to http://localhost:4000/api in .env

# Launch frontend development server
npm run dev
```

The frontend will start at `http://localhost:5173` (or `http://localhost:5174`).

---

## Environment Variables

### Backend Configuration (`.env`)

| Variable | Description | Example / Placeholder |
|---|---|---|
| `FLASK_APP` | Application entrypoint | `run.py` |
| `FLASK_ENV` | Application runtime environment | `development` / `production` |
| `DATABASE_URL` | Relational database connection string | `mysql+pymysql://<user>:<password>@<host>:<port>/<database>` |
| `JWT_SECRET_KEY` | Secret key for signing JWT tokens | `<strong-cryptographic-secret>` |
| `CORS_ORIGINS` | Permitted client origin URLs | `http://localhost:5173,http://localhost:5174` |
| `SMTP_HOST` | Outgoing SMTP mail server | `smtp.gmail.com` |
| `SMTP_PORT` | Outgoing SMTP port (465 SSL / 587 TLS) | `587` |
| `SMTP_USERNAME` | SMTP authentication username | `<smtp-username>` |
| `SMTP_PASSWORD` | SMTP authentication password or app token | `<smtp-password>` |
| `MAIL_FROM` | Sender address in outbound emails | `Retail Mart <no-reply@retailmart.dev>` |
| `GEMINI_API_KEY` | Google Gemini API key for AI narrative | `<gemini-api-key>` |
| `TRACKINGMORE_API_KEY` | Optional live tracking API key | `<trackingmore-key>` |
| `SHIP24_API_KEY` | Optional Ship24 carrier API key | `<ship24-key>` |

### Frontend Configuration (`.env`)

| Variable | Description | Example / Placeholder |
|---|---|---|
| `VITE_API_BASE_URL` | REST API base URL accessed by the browser | `http://localhost:4000/api` |

---

## Deployment

Retail Mart is architected for decoupled cloud deployment on **Vercel**:

1. **Frontend (Static / Single Page Application):**
   - Built with Vite and TypeScript into optimized static bundles (`npm run build`).
   - Configured with `vercel.json` SPA rewrite rules ensuring direct deep-links (e.g., `/login`, `/shop`, `/cart`, `/wishlist`, `/shipping`) resolve seamlessly to `index.html`.
   - **Production URL:** [https://retail-mart-frontend.vercel.app](https://retail-mart-frontend.vercel.app)

2. **Backend (Serverless REST API):**
   - Deployed as a serverless Python WSGI handler via `api/index.py`.
   - Configured with `vercel.json` routing all `/api/*` traffic to the serverless function.
   - Connected securely to a managed cloud MySQL instance using SSL.
   - **Production URL:** [https://retail-mart-iota.vercel.app](https://retail-mart-iota.vercel.app)

---

## Testing & Quality Assurance

Retail Mart maintains high code quality and test coverage across both client and server:

### Frontend Test Verification
- **Test Runner:** Vitest v2.1.9 + React Testing Library
- **Coverage:** 14 test suites, 53 tests passing (authentication flows, route guards, shipping timelines, form validations, payment vs refund separation).
```bash
cd retail-mart-frontend-connected/retail-mart-week2-final
npm test
```

### TypeScript Verification
```bash
npm run build
```
Ensures 100% strict TypeScript type compliance with zero compilation errors.

### Backend End-to-End Test Verification
```bash
cd retail-mart-backend/retail-mart-backend
python test_verification.py
python test_e2e_wishlist.py
```
- Validates all 11 core backend subsystems (Health, Auth, Customer Stats, Couriers, Shipments, Tracking, Reports, AI Projections in INR, SMTP status).
- Validates multi-tenant customer wishlist isolation and idempotency.

---

## Security & Data Integrity

- **Stateless JWT Authentication:** Access tokens signed with secure HMAC algorithms, incorporating user identity and role claims.
- **Role-Based Authorization:** Server-side decorators strictly prevent privilege escalation on all sensitive endpoints.
- **Data Protection & PII Segregation:** Executive analytics and reporting endpoints aggregate metrics strictly at the database layer, completely excluding customer names, emails, and contact details from analytical payloads.
- **Environment Isolation:** Zero credentials, keys, or connection strings are checked into version control; runtime configurations are strictly loaded from environment variables.
- **Database Safeguards:** Foreign-key constraints and relational integrity rules prevent cascading accidental deletions across active shipments, orders, and payments.

---

## License & Project Status

This repository is maintained as an active production-grade e-commerce and retail operations platform demonstration. Released under the [MIT License](LICENSE).
