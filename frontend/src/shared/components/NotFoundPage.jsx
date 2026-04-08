import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-surface-50">
      <p className="text-8xl font-bold text-primary-100 font-mono select-none">404</p>
      <h1 className="text-2xl font-bold text-surface-900 mt-4 mb-2">Page not found</h1>
      <p className="text-gray-500 text-sm mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/dashboard" className="fs-btn-primary px-6 py-3">Back to Dashboard</Link>
    </div>
  )
}
