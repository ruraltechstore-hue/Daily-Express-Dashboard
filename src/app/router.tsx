import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { LoadingSpinner } from '@/components/shared';

// ─── Lazy-loaded pages ───────────────────────────────────────────
const LoginPage = lazy(() =>
  import('@/features/auth/pages/login').then((m) => ({ default: m.LoginPage }))
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/dashboard').then((m) => ({ default: m.DashboardPage }))
);
const CategoriesPage = lazy(() =>
  import('@/features/categories/pages/categories-page').then((m) => ({ default: m.CategoriesPage }))
);
const CategoryFormPage = lazy(() =>
  import('@/features/categories/pages/category-form-page').then((m) => ({ default: m.CategoryFormPage }))
);
const ProductsPage = lazy(() =>
  import('@/features/products/pages/products-page').then((m) => ({ default: m.ProductsPage }))
);
const ProductFormPage = lazy(() =>
  import('@/features/products/pages/product-form-page').then((m) => ({ default: m.ProductFormPage }))
);
const OrdersPage = lazy(() =>
  import('@/features/orders/pages/orders-page').then((m) => ({ default: m.OrdersPage }))
);
const OrderDetailPage = lazy(() =>
  import('@/features/orders/pages/order-detail-page').then((m) => ({ default: m.OrderDetailPage }))
);
const CustomersPage = lazy(() =>
  import('@/features/customers/pages/customers-page').then((m) => ({ default: m.CustomersPage }))
);
const CustomerDetailPage = lazy(() =>
  import('@/features/customers/pages/customer-detail-page').then((m) => ({ default: m.CustomerDetailPage }))
);
const DeliveryBoysPage = lazy(() =>
  import('@/features/delivery-boys/pages/delivery-boys-page').then((m) => ({ default: m.DeliveryBoysPage }))
);
const DeliveryBoyFormPage = lazy(() =>
  import('@/features/delivery-boys/pages/delivery-boy-form-page').then((m) => ({ default: m.DeliveryBoyFormPage }))
);
const DeliveryBoyDetailPage = lazy(() =>
  import('@/features/delivery-boys/pages/delivery-boy-detail-page').then((m) => ({ default: m.DeliveryBoyDetailPage }))
);
const SubscriptionsPage = lazy(() =>
  import('@/features/subscriptions/pages/subscriptions-page').then((m) => ({ default: m.SubscriptionsPage }))
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications/pages/notifications-page').then((m) => ({ default: m.NotificationsPage }))
);
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/reports-page').then((m) => ({ default: m.ReportsPage }))
);
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/settings-page').then((m) => ({ default: m.SettingsPage }))
);

// ─── Suspense Wrapper ────────────────────────────────────────────
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  );
}

// ─── Router ──────────────────────────────────────────────────────
export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <LazyPage>
        <LoginPage />
      </LazyPage>
    ),
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <LazyPage><DashboardPage /></LazyPage>,
      },
      {
        path: 'categories',
        element: <LazyPage><CategoriesPage /></LazyPage>,
      },
      {
        path: 'categories/new',
        element: <LazyPage><CategoryFormPage /></LazyPage>,
      },
      {
        path: 'categories/:id/edit',
        element: <LazyPage><CategoryFormPage /></LazyPage>,
      },
      {
        path: 'products',
        element: <LazyPage><ProductsPage /></LazyPage>,
      },
      {
        path: 'products/new',
        element: <LazyPage><ProductFormPage /></LazyPage>,
      },
      {
        path: 'products/:id/edit',
        element: <LazyPage><ProductFormPage /></LazyPage>,
      },
      {
        path: 'orders',
        element: <LazyPage><OrdersPage /></LazyPage>,
      },
      {
        path: 'orders/:id',
        element: <LazyPage><OrderDetailPage /></LazyPage>,
      },
      {
        path: 'customers',
        element: <LazyPage><CustomersPage /></LazyPage>,
      },
      {
        path: 'customers/:id',
        element: <LazyPage><CustomerDetailPage /></LazyPage>,
      },
      {
        path: 'delivery-boys',
        element: <LazyPage><DeliveryBoysPage /></LazyPage>,
      },
      {
        path: 'delivery-boys/new',
        element: <LazyPage><DeliveryBoyFormPage /></LazyPage>,
      },
      {
        path: 'delivery-boys/:id',
        element: <LazyPage><DeliveryBoyDetailPage /></LazyPage>,
      },
      {
        path: 'subscriptions',
        element: <LazyPage><SubscriptionsPage /></LazyPage>,
      },
      {
        path: 'notifications',
        element: <LazyPage><NotificationsPage /></LazyPage>,
      },
      {
        path: 'reports',
        element: <LazyPage><ReportsPage /></LazyPage>,
      },
      {
        path: 'settings',
        element: <LazyPage><SettingsPage /></LazyPage>,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
