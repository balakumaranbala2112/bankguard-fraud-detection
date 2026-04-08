import { Navigate } from 'react-router-dom'
import ProtectedRoute from '@/shared/components/ProtectedRoute'
import LoginPage    from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import ProfilePage  from '@/features/auth/pages/ProfilePage'
import DashboardPage           from '@/features/transactions/pages/DashboardPage'
import SendMoneyPage           from '@/features/transactions/pages/SendMoneyPage'
import TransactionHistoryPage  from '@/features/transactions/pages/TransactionHistoryPage'
import AlertsPage  from '@/features/alerts/pages/AlertsPage'
import AdminPage   from '@/features/admin/pages/AdminPage'
import NotFoundPage from '@/shared/components/NotFoundPage'

export const routes = [
  // Public
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Protected shell
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/send',      element: <SendMoneyPage /> },
      { path: '/history',   element: <TransactionHistoryPage /> },
      { path: '/alerts',    element: <AlertsPage /> },
      { path: '/profile',   element: <ProfilePage /> },
    ],
  },

  // Admin-only shell
  {
    element: <ProtectedRoute adminOnly />,
    children: [
      { path: '/admin', element: <AdminPage /> },
    ],
  },

  // Redirects
  { path: '/',    element: <Navigate to="/dashboard" replace /> },
  { path: '*',    element: <NotFoundPage /> },
]
