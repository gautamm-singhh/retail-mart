import { vi } from "vitest";
import { mockUsers } from "@/features/users/data/users";
import { mockCategories } from "@/features/categories/data/categories";
import { mockProducts } from "@/features/products/data/products";
import { mockOrders } from "@/features/orders/data/orders";
import { mockPayments } from "@/features/payments/data/payments";
import { mockShipments } from "@/features/shipping/data/shipments";
import { ORDER_STATUS_TRANSITIONS } from "@/types";
import type { Category, Order, OrderStatus, Payment, PaymentStatus, Product, Shipment, User } from "@/types";

/**
 * A minimal in-memory stand-in for retail-mart-backend, used only in
 * tests. It mirrors the handful of behaviours our tests actually rely on
 * (auth, order status transitions, payment status updates) so tests keep
 * exercising "what happens when the API responds like X" rather than
 * reaching into repository internals. It is deliberately not a full
 * reimplementation of the Flask app - see that project for the real rules.
 */

const API_BASE = "http://localhost:4000/api";

/** Any seeded user can sign in with this password in tests (matches the backend's seed.py). */
const TEST_PASSWORD = "password123";

let users: User[] = [];
let categories: Category[] = [];
let products: Product[] = [];
let orders: Order[] = [];
let payments: Payment[] = [];
let shipments: Shipment[] = [];

export function resetMockApi() {
  users = mockUsers.map((u) => ({ ...u }));
  categories = mockCategories.map((c) => ({ ...c }));
  products = mockProducts.map((p) => ({ ...p }));
  orders = mockOrders.map((o) => ({ ...o, items: [...o.items], statusHistory: [...o.statusHistory] }));
  payments = mockPayments.map((p) => ({ ...p, history: [...p.history] }));
  shipments = mockShipments.map((s) => ({ ...s, trackingHistory: [...s.trackingHistory] }));
}

function json(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseBody(init?: RequestInit): Record<string, unknown> {
  if (!init?.body) return {};
  try {
    return JSON.parse(init.body as string);
  } catch {
    return {};
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function handle(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const body = parseBody(init);

  // --- Auth ---------------------------------------------------------
  if (path === "/auth/login" && method === "POST") {
    const email = String(body.email ?? "").toLowerCase();
    const password = String(body.password ?? "");
    const user = users.find((u) => u.email.toLowerCase() === email);
    if (!user || password !== TEST_PASSWORD) {
      return json({ error: "Invalid email or password" }, 401);
    }
    return json({ accessToken: `test-token-${user.id}`, user });
  }

  if (path === "/auth/me" && method === "GET") {
    const auth = (init?.headers as Record<string, string> | undefined)?.["Authorization"] ?? "";
    const match = /test-token-(.+)/.exec(auth);
    const user = match && users.find((u) => u.id === match[1]);
    if (!user) return json({ error: "Unauthorized" }, 401);
    return json(user);
  }

  // --- Users ----------------------------------------------------------
  if (path === "/users" && method === "GET") return json(users);
  const userMatch = /^\/users\/([^/]+)$/.exec(path);
  if (userMatch && method === "DELETE") {
    users = users.filter((u) => u.id !== userMatch[1]);
    return json(null, 204);
  }
  const userStatusMatch = /^\/users\/([^/]+)\/status$/.exec(path);
  if (userStatusMatch && method === "PATCH") {
    const user = users.find((u) => u.id === userStatusMatch[1]);
    if (!user) return json({ error: "User not found" }, 404);
    user.status = body.status as User["status"];
    return json(user);
  }
  if (userMatch && method === "PUT") {
    const user = users.find((u) => u.id === userMatch[1]);
    if (!user) return json({ error: "User not found" }, 404);
    Object.assign(user, body);
    return json(user);
  }
  if (path === "/users" && method === "POST") {
    const newUser: User = {
      id: `u-${String(users.length + 1).padStart(3, "0")}`,
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      role: (body.role as User["role"]) ?? "Staff",
      status: (body.status as User["status"]) ?? "active",
      createdAt: todayIso(),
    };
    users.push(newUser);
    return json(newUser, 201);
  }

  // --- Categories -------------------------------------------------------
  if (path === "/categories" && method === "GET") return json(categories);

  // --- Products ---------------------------------------------------------
  if (path === "/products" && method === "GET") return json(products);

  // --- Orders -------------------------------------------------------
  if (path === "/orders" && method === "GET") return json(orders);
  const orderStatusMatch = /^\/orders\/([^/]+)\/status$/.exec(path);
  if (orderStatusMatch && method === "PATCH") {
    const order = orders.find((o) => o.id === orderStatusMatch[1]);
    if (!order) return json({ error: "Order not found" }, 404);
    const nextStatus = body.status as OrderStatus;
    const allowed = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(nextStatus)) {
      return json(
        { error: `Cannot move an order from '${order.status}' to '${nextStatus}'` },
        409,
      );
    }
    order.status = nextStatus;
    order.statusHistory = [...order.statusHistory, { status: nextStatus, date: todayIso() }];
    return json(order);
  }

  // --- Payments -----------------------------------------------------
  if (path === "/payments" && method === "GET") return json(payments);
  const paymentStatusMatch = /^\/payments\/([^/]+)\/status$/.exec(path);
  if (paymentStatusMatch && method === "PATCH") {
    const payment = payments.find((p) => p.id === paymentStatusMatch[1]);
    if (!payment) return json({ error: "Payment not found" }, 404);
    const nextStatus = body.status as PaymentStatus;
    payment.status = nextStatus;
    payment.history = [...payment.history, { status: nextStatus, date: todayIso() }];
    return json(payment);
  }

  // --- Shipments ----------------------------------------------------
  if (path === "/shipments" && method === "GET") return json(shipments);

  // --- Dashboard ------------------------------------------------------
  if (path === "/dashboard/summary" && method === "GET") {
    return json([
      { label: "Active Users", value: String(users.filter((u) => u.status === "active").length), hint: `${users.length} total accounts` },
      { label: "Total Products", value: String(products.length), hint: "0 out of stock" },
      { label: "Pending Orders", value: String(orders.filter((o) => o.status === "Pending").length), hint: `${orders.length} orders total` },
      { label: "Total Payments", value: String(payments.filter((p) => p.status === "Paid").length), hint: "0 failed" },
      { label: "Pending Shipments", value: String(shipments.filter((s) => s.status !== "Delivered").length), hint: "0 delivered" },
    ]);
  }

  return json({ error: `No mock handler for ${method} ${path}` }, 404);
}

export function installMockApi() {
  resetMockApi();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith(API_BASE)) {
        throw new Error(`mockApi: unexpected fetch to non-API URL: ${url}`);
      }
      const path = url.slice(API_BASE.length);
      return handle(path, init);
    }),
  );
}
