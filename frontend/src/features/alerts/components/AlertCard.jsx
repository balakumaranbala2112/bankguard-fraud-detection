import { formatDateTime, formatCurrency } from "@/shared/utils";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

const SEVERITY = {
  HIGH: {
    border: "#dc2626",
    bg: "#fef2f2",
    iconBg: "#fee2e2",
    Icon: AlertTriangle,
    iconColor: "#dc2626",
    labelColor: "#991b1b",
  },
  MEDIUM: {
    border: "#d97706",
    bg: "#fffbeb",
    iconBg: "#fef3c7",
    Icon: ShieldAlert,
    iconColor: "#d97706",
    labelColor: "#92400e",
  },
  LOW: {
    border: "#16a34a",
    bg: "#f0fdf4",
    iconBg: "#dcfce7",
    Icon: ShieldCheck,
    iconColor: "#16a34a",
    labelColor: "#166534",
  },
};

export default function AlertCard({ alert }) {
  const level = alert.severity || alert.riskLevel || "MEDIUM";
  const s = SEVERITY[level] || SEVERITY.MEDIUM;
  const { Icon } = s;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .alert-card {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
          padding: 14px 16px; border-radius: 12px; border-left: 3px solid;
          font-family: 'DM Sans', sans-serif;
        }
        .alert-card-left  { display: flex; align-items: flex-start; gap: 11px; flex: 1; min-width: 0; }
        .alert-icon-wrap  { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .alert-type       { font-size: 13px; font-weight: 600; margin: 0 0 3px; }
        .alert-msg        { font-size: 12px; color: #64748b; margin: 0; line-height: 1.5; }
        .alert-card-right { text-align: right; flex-shrink: 0; }
        .alert-amount     { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: #0f172a; margin: 0 0 3px; }
        .alert-time       { font-size: 11px; color: #94a3b8; margin: 0; }
      `}</style>

      <div
        className="alert-card"
        style={{ background: s.bg, borderLeftColor: s.border }}
      >
        <div className="alert-card-left">
          <div className="alert-icon-wrap" style={{ background: s.iconBg }}>
            <Icon size={16} color={s.iconColor} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="alert-type" style={{ color: s.labelColor }}>
              {alert.attackType || alert.type || "Fraud Alert"}
            </p>
            <p className="alert-msg">{alert.message || alert.description}</p>
          </div>
        </div>

        <div className="alert-card-right">
          {alert.amount && (
            <p className="alert-amount">{formatCurrency(alert.amount)}</p>
          )}
          <p className="alert-time">{formatDateTime(alert.createdAt)}</p>
        </div>
      </div>
    </>
  );
}
