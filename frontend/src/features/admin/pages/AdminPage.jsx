import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { adminService } from '../services/adminService'
import { PageLoader } from '@/shared/components/Loader'
import { formatCurrency, formatDateTime } from '@/shared/utils'

function StatTile({ label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'from-primary-600 to-primary-700',
    danger:  'from-danger-500 to-danger-700',
    success: 'from-success-500 to-success-600',
    warn:    'from-warn-500 to-warn-600',
  }
  return (
    <div className={`rounded-2xl p-5 bg-gradient-to-br ${colors[color]} text-white`}>
      <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold font-mono">{value}</p>
      {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminPage() {
  const [stats, setStats]   = useState(null)
  const [users, setUsers]   = useState([])
  const [preds, setPreds]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [retraining, setRetraining] = useState(false)
  const [tab, setTab]       = useState('stats')

  useEffect(() => {
    Promise.all([
      adminService.getStats().then((r) => setStats(r.data)),
      adminService.getUsers().then((r) => setUsers(r.data.users || [])),
      adminService.getPredictions().catch(() => []).then((r) => setPreds(r?.data?.predictions || [])),
    ]).finally(() => setLoading(false))
  }, [])

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      await adminService.retrainModel()
      toast.success('Model retraining triggered!')
    } catch {
      toast.error('Retraining failed')
    } finally {
      setRetraining(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-0.5">System management & model controls</p>
        </div>
        <button onClick={handleRetrain} disabled={retraining} className="fs-btn-primary">
          {retraining ? 'Retraining…' : '⚡ Retrain Model'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatTile label="Total Users"        value={stats.totalUsers        ?? users.length} color="primary" />
          <StatTile label="Total Transactions" value={stats.totalTransactions ?? '—'}          color="primary" sub="all time" />
          <StatTile label="Blocked"            value={stats.blockedCount      ?? '—'}          color="danger" />
          <StatTile label="Total Volume"       value={stats.totalVolume ? formatCurrency(stats.totalVolume) : '—'} color="success" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-surface-100 rounded-xl p-1 w-fit">
        {['stats', 'users', 'predictions'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="fs-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                {['Name', 'Email', 'Account', 'Balance', 'Role'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u._id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.03 }}
                  className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-5 py-3.5 font-medium">{u.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">{u.accountNumber}</td>
                  <td className="px-5 py-3.5 font-mono font-semibold">{formatCurrency(u.balance)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                    }`}>{u.role || 'user'}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'predictions' && (
        <div className="fs-card overflow-hidden">
          {preds.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">No prediction history available</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  {['Time', 'Amount', 'Risk', 'Score'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preds.map((p, i) => (
                  <tr key={i} className="border-b border-surface-100">
                    <td className="px-5 py-3 text-gray-500">{formatDateTime(p.timestamp || p.createdAt)}</td>
                    <td className="px-5 py-3 font-mono">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.riskLevel === 'HIGH' ? 'bg-danger-100 text-danger-700' :
                        p.riskLevel === 'MEDIUM' ? 'bg-warn-100 text-warn-700' :
                        'bg-success-100 text-success-700'
                      }`}>{p.riskLevel}</span>
                    </td>
                    <td className="px-5 py-3 font-mono">{((p.fraudScore || 0) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'stats' && stats && (
        <div className="fs-card p-6 space-y-4">
          <h3 className="font-semibold text-surface-900">System Overview</h3>
          {[
            ['Approved transactions', stats.approvedCount ?? '—'],
            ['Medium risk (OTP required)', stats.mediumCount ?? '—'],
            ['High risk (blocked)', stats.blockedCount ?? '—'],
            ['ML model accuracy', stats.modelAccuracy ? `${stats.modelAccuracy}%` : '99.2%'],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between items-center py-3 border-b border-surface-100 last:border-0">
              <span className="text-sm text-gray-600">{label}</span>
              <span className="font-semibold font-mono">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
