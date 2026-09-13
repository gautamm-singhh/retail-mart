// Single source of truth for route paths. Import ROUTES instead of writing
// path strings inline, so renaming a route only requires a change here.
export const ROUTES = {
  root: "/",
  login: "/login",
  dashboard: "/dashboard",
  users: "/users",
  products: "/products",
  categories: "/categories",
  orders: "/orders",
  payments: "/payments",
  refunds: "/payments/refunds",
  shipping: "/shipping",
  couriers: "/couriers",
  communications: "/communications",
  campaigns: "/campaigns",
  reports: "/reports",
  analytics: "/analytics",
  profile: "/profile",
  signup: "/signup",
  // Storefront (Week 4) - a separate portal from the admin console above,
  // with its own layout (StorefrontLayout) and its own nav. See the
  // router's comment for why these are a sibling route tree, not nested
  // under the admin's ProtectedRoute.
  shop: "/shop",
  shopLogin: "/shop/login",
  shopProduct: "/shop/product",
  cart: "/shop/cart",
  checkout: "/shop/checkout",
  myOrders: "/shop/orders",
  account: "/shop/account",
  wishlist: "/shop/wishlist",
} as const;

export type NavRoute = {
  label: string;
  path: string;
  icon:
    | "dashboard"
    | "users"
    | "products"
    | "categories"
    | "orders"
    | "payments"
    | "shipping"
    | "couriers"
    | "communications"
    | "campaigns"
    | "reports"
    | "analytics";
};

// Sidebar order and labels are driven from this list so AdminLayout doesn't
// need to know the routes itself.
export const NAV_ROUTES: NavRoute[] = [
  { label: "Dashboard", path: ROUTES.dashboard, icon: "dashboard" },
  { label: "Users", path: ROUTES.users, icon: "users" },
  { label: "Products", path: ROUTES.products, icon: "products" },
  { label: "Categories", path: ROUTES.categories, icon: "categories" },
  { label: "Orders", path: ROUTES.orders, icon: "orders" },
  { label: "Payments", path: ROUTES.payments, icon: "payments" },
  { label: "Shipping", path: ROUTES.shipping, icon: "shipping" },
  { label: "Couriers", path: ROUTES.couriers, icon: "couriers" },
  { label: "Communications", path: ROUTES.communications, icon: "communications" },
  { label: "Campaigns", path: ROUTES.campaigns, icon: "campaigns" },
  { label: "Reports", path: ROUTES.reports, icon: "reports" },
  { label: "Analytics", path: ROUTES.analytics, icon: "analytics" },
];
