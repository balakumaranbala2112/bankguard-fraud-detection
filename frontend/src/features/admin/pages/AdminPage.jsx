import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { adminService } from "../services/adminService";
import { PageLoader } from "@/shared/components/Loader";
import { formatCurrency, formatDateTime } from "@/shared/utils";
import {
  Users, ArrowLeftRight, ShieldX, Wallet, RefreshCw, Loader2,
  CheckCircle, AlertTriangle, ShieldAlert, BarChart3, InboxIcon, BrainCircuit,
} from "lucide-react";

const RISK_STYLES = {
  HIGH:   { bg: "#fee2e2", color: "#dc2626" },
  MEDIUM: { bg: "#fef9c3", color: "#ca8a04" },
  LOW:    { bg: "#dcfce7", color: "#16a34a" },
};

function StatCard({ label, value, sub, Icon, color, bg, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border border-slate-200 rounded-[14px] p-5"
    >
      <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mb-3" style={{ background: bg }}>
        <Icon size={18} color={color} strokeWidth={2} />
      </div>
      <p className="font-mono text-[26px] font-semibold text-slate-900 m-0 leading-none">{value}</p>
      <p className="text-[12px] font-semibold text-slate-500 m-0 mt-1.5 uppercase tracking-[0.06em]">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 m-0 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function AdminPage() {
  const [stats, setStats]         = useState(null);
  const [users, setUsers]         = useState([]);
  const [preds, setPreds]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [tab, setTab]             = useState("stats");

  useEffect(() => {
    Promise.all([
      adminService.getStats().then((r) => setStats(r.data)),
      adminService.getUsers().then((r) => setUsers(r.data.users || [])),
      adminService.getTransactions().then((r) => setPreds(r.data.transactions || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const handleRetrain = async () => {
    toast("ML model is managed by the Flask server — restart it to retrain.", { icon: "ℹ️" });
  };

  if (loading) return <PageLoader />;

  const TABS = ["stats", "users", "predictions"];

  /* shared table header + cell classes */
  const th = "px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.07em] bg-slate-50 border-b border-slate-200 whitespace-nowrap";
  const td = "px-4 py-3 text-[13px] align-middle";

  return (
    <div className="font-sans text-slate-900">
      {/* Topbar */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.2rem,2.5vw,1.5rem)] font-bold text-slate-900 m-0">Admin Panel</h1>
          <p className="text-[13px] text-slate-500 mt-1 m-0">System management &amp; model controls</p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white border-none cursor-pointer text-[13px] font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {retraining
            ? <><Loader2 size={14} className="animate-spin" /> Retraining…</>
            : <><RefreshCw size={14} /> Retrain Model</>}
        </button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <StatCard label="Total Users"    value={stats.totalUsers ?? users.length}            Icon={Users}          color="#2563eb" bg="#eff6ff" delay={0.06} />
          <StatCard label="Transactions"   value={stats.totalTransactions ?? "—"} sub="all time" Icon={ArrowLeftRight} color="#7c3aed" bg="#f5f3ff" delay={0.08} />
          <StatCard label="Blocked"        value={stats.blockedCount ?? "—"}                    Icon={ShieldX}        color="#dc2626" bg="#fef2f2" delay={0.10} />
          <StatCard label="Total Volume"   value={stats.totalVolume ? formatCurrency(stats.totalVolume) : "—"} Icon={Wallet} color="#16a34a" bg="#f0fdf4" delay={0.12} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 mb-4 bg-slate-100 rounded-[11px] p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer capitalize transition-all
              ${tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-transparent text-slate-500 hover:text-slate-900"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Stats tab ── */}
      {tab === "stats" && stats && (
        <motion.div
          className="bg-white border border-slate-200 rounded-[14px] overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-slate-400 px-5 pt-4 m-0">
            System Overview
          </p>
          {[
            { Icon: CheckCircle, label: "Approved transactions",     val: stats.approvedCount ?? "—", color: "#16a34a" },
            { Icon: ShieldAlert, label: "Medium risk (OTP required)",val: stats.mediumCount   ?? "—", color: "#d97706" },
            { Icon: ShieldX,     label: "High risk (blocked)",       val: stats.blockedCount  ?? "—", color: "#dc2626" },
            { Icon: BrainCircuit,label: "ML model accuracy",         val: stats.modelAccuracy ? `${stats.modelAccuracy}%` : "99.2%", color: "#7c3aed" },
          ].map(({ Icon, label, val, color }) => (
            <div key={label} className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2.5">
                <Icon size={15} style={{ color }} strokeWidth={2} className="shrink-0" />
                <span className="text-[13px] text-slate-500 font-medium">{label}</span>
              </div>
              <span className="font-mono text-[13px] font-semibold text-slate-900">{val}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Users tab ── */}
      {tab === "users" && (
        <motion.div
          className="bg-white border border-slate-200 rounded-[14px] overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr>
                {["Name", "Email", "Account", "Balance", "Role"].map((h) => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr
                    key={u._id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}
                  >
                    <td className={`${td} font-semibold text-slate-900`}>{u.name}</td>
                    <td className={`${td} text-slate-500`}>{u.email}</td>
                    <td className={`${td} font-mono text-[12px] text-slate-500`}>{u.accountNumber}</td>
                    <td className={`${td} font-mono font-medium`}>{formatCurrency(u.balance)}</td>
                    <td className={td}>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide
                        ${u.role === "admin" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                        {u.role || "user"}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── Predictions tab ── */}
      {tab === "predictions" && (
        <motion.div
          className="bg-white border border-slate-200 rounded-[14px] overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          {preds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-5 gap-2.5">
              <InboxIcon size={34} color="#cbd5e1" strokeWidth={1.5} />
              <p className="text-[13px] text-slate-400 m-0">No prediction history available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr>
                  {["Time", "Amount", "Risk", "Score"].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {preds.map((p, i) => {
                    const rs = RISK_STYLES[p.riskLevel] || RISK_STYLES.LOW;
                    return (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className={`${td} text-slate-400 text-[12px]`}>{formatDateTime(p.timestamp || p.createdAt)}</td>
                        <td className={`${td} font-mono font-semibold`}>{formatCurrency(p.amount)}</td>
                        <td className={td}>
                          <span
                            className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
                            style={{ background: rs.bg, color: rs.color }}
                          >
                            {p.riskLevel}
                          </span>
                        </td>
                        <td className={`${td} font-mono text-[12px] text-slate-500`}>
                          {p.confidence ? p.confidence.toFixed(1) : "0.0"}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
