import { RISK_LABELS } from '@/shared/constants'

const icons = {
  LOW:    '✓',
  MEDIUM: '⚠',
  HIGH:   '✕',
}

export default function RiskBadge({ level }) {
  const classMap = {
    LOW:    'fs-badge-low',
    MEDIUM: 'fs-badge-medium',
    HIGH:   'fs-badge-high',
  }
  return (
    <span className={classMap[level] || 'fs-badge-low'}>
      {icons[level]} {RISK_LABELS[level] || level}
    </span>
  )
}
