import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";
import StorefrontLayout from "@/layouts/StorefrontLayout";
import LoginPage from "@/pages/LoginPage";
import CustomerLoginPage from "@/pages/CustomerLoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailsPage from "@/pages/UserDetailsPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductDetailsPage from "@/pages/ProductDetailsPage";
import CategoriesPage from "@/pages/CategoriesPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailsPage from "@/pages/OrderDetailsPage";
import PaymentsPage from "@/pages/PaymentsPage";
import RefundsPage from "@/pages/RefundsPage";
import PaymentDetailsPage from "@/pages/PaymentDetailsPage";
import ShippingPage from "@/pages/ShippingPage";
import ShipmentDetailsPage from "@/pages/ShipmentDetailsPage";
import CouriersPage from "@/pages/CouriersPage";
import CampaignsPage from "@/pages/CampaignsPage";
import CommunicationsPage from "@/pages/CommunicationsPage";
import ReportsPage from "@/pages/ReportsPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ProfilePage from "@/pages/ProfilePage";
import ShopHomePage from "@/pages/ShopHomePage";
import ShopProductDetailPage from "@/pages/ShopProductDetailPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import MyOrdersPage from "@/pages/MyOrdersPage";
import AccountPage from "@/pages/AccountPage";
import WishlistPage from "@/pages/WishlistPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ROUTES } from "@/constants/routes";

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
export const router = createBrowserRouter([
  { path: ROUTES.login, element: <LoginPage /> },
  { path: ROUTES.shopLogin, element: <CustomerLoginPage /> },
  { path: ROUTES.signup, element: <SignupPage /> },
  {
    element: <ProtectedRoute allowedRoles={["Admin", "Manager", "Staff"]} />,
    children: [
      {
        path: ROUTES.root,
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.dashboard} replace /> },
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
          { path: "*", element: <NotFoundPage /> },
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
]);
