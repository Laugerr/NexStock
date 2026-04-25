import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { WarehousesPage } from '@/pages/warehouses/WarehousesPage'
import { ProductsPage } from '@/pages/products/ProductsPage'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { StockMovementsPage } from '@/pages/stock-movements/StockMovementsPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { AuditPage } from '@/pages/audit/AuditPage'
import { GrnPage } from '@/pages/grn/GrnPage'
import { PutAwayPage } from '@/pages/put-away/PutAwayPage'
import { PickPackPage } from '@/pages/pick-pack/PickPackPage'
import { CycleCountPage } from '@/pages/cycle-count/CycleCountPage'
import { useAuthStore } from '@/store/auth.store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'warehouses', element: <WarehousesPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'stock-movements', element: <StockMovementsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'grn', element: <GrnPage /> },
      { path: 'put-away', element: <PutAwayPage /> },
      { path: 'pick-pack', element: <PickPackPage /> },
      { path: 'cycle-count', element: <CycleCountPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
