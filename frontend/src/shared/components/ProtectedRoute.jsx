import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import Sidebar from './Sidebar'

export default function ProtectedRoute({ adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      {/* Mobile: top padding for the fixed top bar (h-14). Desktop: left margin for fixed sidebar (w-60). */}
      <main className="flex-1 pt-14 md:pt-0 md:ml-60 min-h-screen">
        <div className="px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 max-w-[1200px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
