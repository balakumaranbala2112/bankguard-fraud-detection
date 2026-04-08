import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAlerts } from '../hooks/useAlerts'
import AlertCard from '../components/AlertCard'
import { PageLoader } from '@/shared/components/Loader'

export default function AlertsPage() {
  const { alerts, loading, fetchAlerts } = useAlerts()

  useEffect(() => { fetchAlerts() }, [])

  const highCount = alerts.filter((a) => (a.severity || a.riskLevel) === 'HIGH').length

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Fraud Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{alerts.length} total alerts</p>
        </div>
        {highCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger-50 border border-danger-200 text-danger-700 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-danger-500 risk-pulse" />
            {highCount} high risk
          </span>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : alerts.length === 0 ? (
        <div className="fs-card p-16 text-center">
          <p className="text-5xl mb-3">🛡️</p>
          <p className="text-lg font-semibold text-surface-900 mb-1">All clear!</p>
          <p className="text-gray-500 text-sm">No fraud alerts at the moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert._id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <AlertCard alert={alert} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
