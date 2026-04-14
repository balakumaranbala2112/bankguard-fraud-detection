import { formatDateTime, formatCurrency } from "@/shared/utils";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

const SEVERITY = {
  HIGH:   { border: "#dc2626", bg: "#fef2f2", iconBg: "#fee2e2", Icon: AlertTriangle, iconColor: "#dc2626", labelColor: "#991b1b" },
  MEDIUM: { border: "#d97706", bg: "#fffbeb", iconBg: "#fef3c7", Icon: ShieldAlert,   iconColor: "#d97706", labelColor: "#92400e" },
  LOW:    { border: "#16a34a", bg: "#f0fdf4", iconBg: "#dcfce7", Icon: ShieldCheck,   iconColor: "#16a34a", labelColor: "#166534" },
};

export default function AlertCard({ alert }) {
  const level = alert.severity || alert.riskLevel || "MEDIUM";
  const s = SEVERITY[level] || SEVERITY.MEDIUM;
  const { Icon } = s;

  return (
    <div
      className="flex items-start justify-between gap-4 px-4 py-3.5 rounded-xl border-l-[3px] font-sans"
      style={{ background: s.bg, borderLeftColor: s.border }}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: s.iconBg }}
        >
          <Icon size={16} color={s.iconColor} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold m-0 mb-0.5" style={{ color: s.labelColor }}>
            {alert.attackType || alert.type || "Fraud Alert"}
          </p>
          <p className="text-[12px] text-slate-500 m-0 leading-relaxed">
            {alert.message || alert.description}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        {alert.amount && (
          <p className="font-mono text-[13px] font-semibold text-slate-900 m-0 mb-0.5">
            {formatCurrency(alert.amount)}
          </p>
        )}
        <p className="text-[11px] text-slate-400 m-0">{formatDateTime(alert.createdAt)}</p>
      </div>
    </div>
  );
}
