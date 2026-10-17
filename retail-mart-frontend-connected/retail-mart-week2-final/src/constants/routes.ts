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
  signup: "/shop/signup",
  shop: "/shop",
  shopLogin: "/shop/login",
  shopProduct: "/shop/product",
  cart: "/shop/cart",
  checkout: "/shop/checkout",
  myOrders: "/shop/orders",
  account: "/shop/account",
  wishlist: "/shop/wishlist",
  help: "/help",
  helpFsd: "/help/fsd",
  helpApi: "/help/api",
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
