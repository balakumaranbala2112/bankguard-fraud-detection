import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAlerts } from '../hooks/useAlerts'
import AlertCard from '../components/AlertCard'
import { PageLoader } from '@/shared/components/Loader'
import { ShieldCheck } from 'lucide-react'

export default function AlertsPage() {
  const { alerts, loading, fetchAlerts } = useAlerts()
  useEffect(() => { fetchAlerts() }, [])

  const highCount = alerts.filter((a) => (a.severity || a.riskLevel) === 'HIGH').length

  return (
    <div className="max-w-xl pb-16 font-sans text-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.4rem,3vw,1.7rem)] font-extrabold text-slate-900 m-0 mb-1 tracking-tight">
            Security Center
          </h1>
          <p className="text-[13px] text-slate-500 m-0">Recent fraud alerts and account blocks</p>
        </div>
        {highCount > 0 && (
          <motion.div
            initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200 text-[12px] font-bold text-red-600 uppercase tracking-wide"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 risk-pulse" />
            {highCount} High Risk
          </motion.div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <PageLoader />
      ) : alerts.length === 0 ? (
        <motion.div
          className="bg-white border border-dashed border-slate-300 rounded-[20px] py-16 px-5 text-center mt-5"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 text-green-600">
            <ShieldCheck size={32} strokeWidth={2} />
          </div>
          <p className="text-[18px] font-bold m-0 mb-2 text-slate-900">All clear!</p>
          <p className="text-[14px] text-slate-500 m-0">
            We haven't detected any suspicious activity on your account.
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {alerts.map((alert, i) => (
            <motion.div
              key={alert._id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
            >
              <AlertCard alert={alert} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
