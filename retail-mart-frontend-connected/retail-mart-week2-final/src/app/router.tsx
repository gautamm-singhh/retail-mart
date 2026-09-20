import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import StorefrontLayout from "@/layouts/StorefrontLayout";
import CustomerLoginPage from "@/pages/CustomerLoginPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import { PageFallback } from "@/components/common/PageFallback";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ROUTES } from "@/constants/routes";

// Admin pages — lazy loaded for optimal initial bundle performance
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const UserDetailsPage = lazy(() => import("@/pages/UserDetailsPage"));
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const ProductDetailsPage = lazy(() => import("@/pages/ProductDetailsPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const OrderDetailsPage = lazy(() => import("@/pages/OrderDetailsPage"));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage"));
const RefundsPage = lazy(() => import("@/pages/RefundsPage"));
const PaymentDetailsPage = lazy(() => import("@/pages/PaymentDetailsPage"));
const ShippingPage = lazy(() => import("@/pages/ShippingPage"));
const ShipmentDetailsPage = lazy(() => import("@/pages/ShipmentDetailsPage"));
const CouriersPage = lazy(() => import("@/pages/CouriersPage"));
const CampaignsPage = lazy(() => import("@/pages/CampaignsPage"));
const CommunicationsPage = lazy(() => import("@/pages/CommunicationsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));

// Storefront pages — lazy loaded
const ShopHomePage = lazy(() => import("@/pages/ShopHomePage"));
const ShopProductDetailPage = lazy(() => import("@/pages/ShopProductDetailPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const MyOrdersPage = lazy(() => import("@/pages/MyOrdersPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const WishlistPage = lazy(() => import("@/pages/WishlistPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// Routing lives in a single place so every screen's URL is defined once and
// the nav sidebar, breadcrumbs, and redirects can all reference ROUTES
// instead of hardcoded strings scattered across the app.
//
// There are two portals sharing one JWT/AuthContext but with separate
// layouts and separate logins:
//   - Admin console: "/" and below, gated by ProtectedRoute with
//     allowedRoles={["Admin","Manager","Staff"]} (default redirect:
//     /login). A signed-in Customer visiting any admin URL is redirected
//     to /shop rather than rendering admin content.
//   - Storefront (Week 4): "/shop" and below, its own layout
//     (StorefrontLayout) with a top nav instead of a sidebar. Browsing
//     (/shop, /shop/product/:id) and the cart (/shop/cart) are public so
//     guests can browse and build a cart before signing in; checkout,
//     order history, and account are gated by the *same* ProtectedRoute
//     component with allowedRoles={["Customer"]} and redirectTo={
//     ROUTES.shopLogin} - an Admin/Staff account wandering in here is
//     sent to /dashboard instead of hitting 403s from customer-only
//     endpoints like GET /addresses.
//
// /payments/refunds is declared as its own static route rather than a
// query param on /payments so it has a real, shareable, back/forward-able
// URL - React Router ranks a static segment ("refunds") above the dynamic
// ":id" segment regardless of declaration order, so this never collides
// with /payments/:id. The same is true of /orders/mine vs /orders/:id on
// the backend.
export const routes: RouteObject[] = [
  { path: ROUTES.root, element: <Navigate to={ROUTES.shopLogin} replace /> },
  { path: ROUTES.login, element: <LoginPage /> },
  { path: ROUTES.shopLogin, element: <CustomerLoginPage /> },
  { path: ROUTES.signup, element: <SignupPage /> },
  { path: "/signup", element: <Navigate to={ROUTES.signup} replace /> },
  {
    element: <ProtectedRoute allowedRoles={["Admin", "Manager", "Staff"]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: ROUTES.dashboard.slice(1), element: <DashboardPage /> },
          { path: ROUTES.users.slice(1), element: <UsersPage /> },
          { path: `${ROUTES.users.slice(1)}/:id`, element: <UserDetailsPage /> },
          { path: ROUTES.products.slice(1), element: <ProductsPage /> },
          { path: `${ROUTES.products.slice(1)}/:id`, element: <ProductDetailsPage /> },
          { path: ROUTES.categories.slice(1), element: <CategoriesPage /> },
          { path: ROUTES.orders.slice(1), element: <OrdersPage /> },
          { path: `${ROUTES.orders.slice(1)}/:id`, element: <OrderDetailsPage /> },
          { path: ROUTES.payments.slice(1), element: <PaymentsPage /> },
          { path: ROUTES.refunds.slice(1), element: <RefundsPage /> },
          { path: `${ROUTES.payments.slice(1)}/:id`, element: <PaymentDetailsPage /> },
          { path: ROUTES.shipping.slice(1), element: <ShippingPage /> },
          { path: `${ROUTES.shipping.slice(1)}/:id`, element: <ShipmentDetailsPage /> },
          { path: ROUTES.couriers.slice(1), element: <CouriersPage /> },
          { path: ROUTES.communications.slice(1), element: <CommunicationsPage /> },
          { path: ROUTES.campaigns.slice(1), element: <CampaignsPage /> },
          { path: ROUTES.reports.slice(1), element: <ReportsPage /> },
          { path: ROUTES.analytics.slice(1), element: <AnalyticsPage /> },
          { path: ROUTES.profile.slice(1), element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    path: ROUTES.shop,
    element: <StorefrontLayout />,
    children: [
      { index: true, element: <ShopHomePage /> },
      { path: "product/:id", element: <ShopProductDetailPage /> },
      { path: "cart", element: <CartPage /> },
      {
        element: <ProtectedRoute redirectTo={ROUTES.shopLogin} allowedRoles={["Customer"]} />,
        children: [
          { path: "checkout", element: <CheckoutPage /> },
          { path: "orders", element: <MyOrdersPage /> },
          { path: "account", element: <AccountPage /> },
          { path: "wishlist", element: <WishlistPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "*",
    element: (
      <Suspense fallback={<PageFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
];

export const router = createBrowserRouter(routes);
