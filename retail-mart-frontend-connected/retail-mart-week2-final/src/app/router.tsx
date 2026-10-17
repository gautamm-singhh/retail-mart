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

const ShopHomePage = lazy(() => import("@/pages/ShopHomePage"));
const ShopProductDetailPage = lazy(() => import("@/pages/ShopProductDetailPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const MyOrdersPage = lazy(() => import("@/pages/MyOrdersPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const WishlistPage = lazy(() => import("@/pages/WishlistPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const ApiDocumentationPage = lazy(() => import("@/pages/help/ApiDocumentationPage"));
const FsdDocumentationPage = lazy(() => import("@/pages/help/FsdDocumentationPage"));

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
    path: ROUTES.help,
    children: [
      { index: true, element: <Navigate to={ROUTES.helpFsd} replace /> },
      {
        path: "fsd",
        element: (
          <Suspense fallback={<PageFallback />}>
            <FsdDocumentationPage />
          </Suspense>
        ),
      },
      {
        path: "api",
        element: (
          <Suspense fallback={<PageFallback />}>
            <ApiDocumentationPage />
          </Suspense>
        ),
      },
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
