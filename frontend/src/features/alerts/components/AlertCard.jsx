import { formatDateTime, formatCurrency } from '@/shared/utils'

const severityStyle = {
  HIGH:   { wrap: 'border-l-4 border-danger-500 bg-danger-50',  dot: 'bg-danger-500',  text: 'text-danger-700' },
  MEDIUM: { wrap: 'border-l-4 border-warn-500 bg-warn-500/8',   dot: 'bg-warn-500',    text: 'text-warn-700' },
  LOW:    { wrap: 'border-l-4 border-success-500 bg-success-500/8', dot: 'bg-success-500', text: 'text-success-700' },
}

export default function AlertCard({ alert }) {
  const s = severityStyle[alert.severity || alert.riskLevel] || severityStyle.MEDIUM

  return (
    <div className={`rounded-xl p-4 ${s.wrap}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${s.dot}`} />
          <div>
            <p className={`text-sm font-semibold ${s.text}`}>
              {alert.attackType || alert.type || 'Fraud Alert'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{alert.message || alert.description}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {alert.amount && (
            <p className="text-sm font-mono font-bold text-surface-900">{formatCurrency(alert.amount)}</p>
          )}
          <p className="text-xs text-gray-400">{formatDateTime(alert.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}
