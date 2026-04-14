import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ArrowUpRight, ShieldOff, Activity, Bell,
  ArrowUp, ArrowDown, ChevronRight, AlertTriangle, Info,
  Send, MapPin, CreditCard,
} from "lucide-react";
import { useAuth }         from "@/features/auth/hooks/useAuth";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useAlerts }       from "@/features/alerts/hooks/useAlerts";
import { PageLoader }      from "@/shared/components/Loader";
import RiskBadge           from "@/features/transactions/components/RiskBadge";
import { formatCurrency, formatDateTime } from "@/shared/utils";

/* ─── helpers ─────────────────────────────────────────── */
function buildAreaData(txns) {
  const map = {};
  txns.forEach((t) => {
    const d = new Date(t.createdAt);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    if (!map[key]) map[key] = { date: key, approved: 0, blocked: 0 };
    if (t.status === "APPROVED") map[key].approved++;
    else if (t.status === "BLOCKED") map[key].blocked++;
  });
  return Object.values(map).slice(-7);
}

function buildPieData(txns) {
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  txns.forEach((t) => { if (counts[t.riskLevel] !== undefined) counts[t.riskLevel]++; });
  return [
    { name: "Low",    value: counts.LOW,    color: "#16a34a" },
    { name: "Medium", value: counts.MEDIUM, color: "#d97706" },
    { name: "High",   value: counts.HIGH,   color: "#dc2626" },
  ].filter((d) => d.value > 0);
}

/* ─── Tooltip ─────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-slate-100 px-3.5 py-2.5 rounded-lg text-xs shadow-xl leading-relaxed">
      <p className="text-slate-400 mb-1 uppercase tracking-wide text-[11px]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="m-0 font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── StatCard ─────────────────────────────────────────── */
function StatCard({ label, value, sub, Icon, color, bg, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white border border-slate-200 rounded-[14px] p-5 flex flex-col gap-1"
    >
      <div
        className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center mb-2"
        style={{ background: bg }}
      >
        <Icon size={18} color={color} strokeWidth={2} />
      </div>
      <p className="font-mono text-[26px] font-semibold text-slate-900 m-0 leading-none">{value}</p>
      <p className="text-[12px] font-semibold text-slate-500 m-0 uppercase tracking-[0.06em]">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 m-0">{sub}</p>}
    </motion.div>
  );
}

/* ─── Dashboard ────────────────────────────────────────── */
export default function DashboardPage() {
  const { user, refreshProfile }             = useAuth();
  const { history, loading: txnLoading, fetchHistory } = useTransactions();
  const { alerts,  loading: alertLoading,  fetchAlerts }  = useAlerts();

  useEffect(() => {
    refreshProfile();
    fetchHistory({ limit: 20 });
    fetchAlerts();
  }, []);

  const loading    = txnLoading || alertLoading;
  const totalTxns  = history.length;
  const approved   = history.filter((t) => t.status === "APPROVED").length;
  const blocked    = history.filter((t) => t.status === "BLOCKED").length;
  const highAlerts = alerts.filter((a) => (a.severity || a.riskLevel) === "HIGH").length;
  const areaData   = buildAreaData(history);
  const pieData    = buildPieData(history);
  const recent     = history.slice(0, 5);

  if (loading && history.length === 0) return <PageLoader />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="font-sans text-slate-900">

      {/* ── Topbar ── */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.2rem,2.5vw,1.55rem)] font-bold text-slate-900 m-0 tracking-tight">
            {greeting}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 m-0">Here's your fraud shield overview</p>
        </div>
        <Link
          to="/send"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl no-underline transition-colors shadow-sm shadow-blue-200 whitespace-nowrap"
        >
          <Send size={14} strokeWidth={2.5} />
          Send Money
        </Link>
      </div>

      {/* ── Balance card ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[18px] p-7 mb-5 text-white"
        style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#3b82f6 100%)" }}
      >
        {/* decorative circles */}
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/[0.07] pointer-events-none" />
        <div className="absolute -bottom-8 right-20 w-32 h-32 rounded-full bg-white/[0.04] pointer-events-none" />

        <p className="text-[11px] tracking-[0.1em] uppercase text-white/55 m-0 mb-2">Available Balance</p>
        <p className="font-mono text-[clamp(1.9rem,5vw,2.8rem)] font-medium m-0 mb-6 leading-none">
          {formatCurrency(user?.balance || 0)}
        </p>
        <div className="flex flex-wrap gap-6 relative z-10">
          <div>
            <span className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase text-white/45 mb-1">
              <CreditCard size={9} /> Account
            </span>
            <span className="font-mono text-[13px] text-white/88">{user?.accountNumber || "—"}</span>
          </div>
          <div>
            <span className="flex items-center gap-1 text-[10px] tracking-[0.1em] uppercase text-white/45 mb-1">
              <MapPin size={9} /> Location
            </span>
            <span className="font-mono text-[13px] text-white/88">{user?.usualLocation || "—"}</span>
          </div>
        </div>
      </motion.div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Transactions" value={totalTxns} sub="last 20 loaded"  Icon={Activity}    color="#2563eb" bg="#eff6ff" delay={0.07} />
        <StatCard label="Approved"     value={approved}  sub="successful"       Icon={ArrowUpRight} color="#16a34a" bg="#f0fdf4" delay={0.09} />
        <StatCard label="Blocked"      value={blocked}   sub="high-risk"        Icon={ShieldOff}   color="#dc2626" bg="#fef2f2" delay={0.11} />
        <StatCard label="Alerts"       value={highAlerts} sub="high severity"   Icon={Bell}        color="#d97706" bg="#fffbeb" delay={0.13} />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3.5 mb-5">
        {/* Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-white border border-slate-200 rounded-[14px] p-5"
        >
          <p className="text-[14px] font-semibold text-slate-900 m-0 mb-4">Transaction Activity — Last 7 Days</p>
          {areaData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[13px] text-slate-400 italic">
              No activity yet — make a transaction!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={196}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis  tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#2563eb" strokeWidth={2} fill="url(#ga)" dot={false} />
                <Area type="monotone" dataKey="blocked"  name="Blocked"  stroke="#dc2626" strokeWidth={2} fill="url(#gb)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.19 }}
          className="bg-white border border-slate-200 rounded-[14px] p-5"
        >
          <p className="text-[14px] font-semibold text-slate-900 m-0 mb-4">Risk Distribution</p>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[13px] text-slate-400 italic">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={196}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="42%" innerRadius={48} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: 12, color: "#64748b" }}>{v}</span>} />
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* ── Recent Transactions ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="bg-white border border-slate-200 rounded-[14px] overflow-hidden mb-5"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <p className="text-[14px] font-semibold text-slate-900 m-0">Recent Transactions</p>
          <Link to="/history" className="text-[12px] font-semibold text-blue-600 no-underline hover:underline inline-flex items-center gap-0.5">
            View all <ChevronRight size={13} />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="py-9 text-center text-[13px] text-slate-400">
            No transactions yet.{" "}
            <Link to="/send" className="text-blue-600">Send money</Link> to get started.
          </div>
        ) : (
          recent.map((txn, i) => {
            const uid      = user?._id || user?.id;
            const isSent   = txn.sender?._id === uid || txn.sender === uid;
            const other    = isSent ? txn.receiver : txn.sender;
            const dir      = isSent ? "To" : "From";
            const isOk     = txn.status === "APPROVED";
            const isBad    = txn.status === "BLOCKED";
            const DirIcon  = isSent ? ArrowUp : ArrowDown;
            const dotBg    = isOk ? "#f0fdf4" : isBad ? "#fef2f2" : "#fffbeb";
            const dotColor = isOk ? "#16a34a" : isBad ? "#dc2626" : "#d97706";
            const tagCls   = isOk
              ? "bg-green-50 text-green-700"
              : isBad
              ? "bg-red-50 text-red-700"
              : "bg-yellow-50 text-yellow-700";

            return (
              <motion.div
                key={txn._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.24 + i * 0.04 }}
                className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: dotBg }}>
                  <DirIcon size={16} color={dotColor} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 m-0 truncate">
                    {dir}: {other?.name || other?.accountNumber || "—"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 m-0">{formatDateTime(txn.createdAt)}</p>
                </div>
                {txn.riskLevel && <RiskBadge level={txn.riskLevel} />}
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <p className="font-mono text-[13px] font-semibold text-slate-900 m-0">{formatCurrency(txn.amount)}</p>
                  <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full ${tagCls}`}>
                    {txn.status}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* ── Recent Alerts ── */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="bg-white border border-slate-200 rounded-[14px] overflow-hidden mb-5"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <p className="text-[14px] font-semibold text-slate-900 m-0">Latest Alerts</p>
            <Link to="/alerts" className="text-[12px] font-semibold text-blue-600 no-underline hover:underline inline-flex items-center gap-0.5">
              View all <ChevronRight size={13} />
            </Link>
          </div>
          {alerts.slice(0, 3).map((alert) => {
            const isHigh = (alert.severity || alert.riskLevel) === "HIGH";
            return (
              <div key={alert._id} className="flex gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0">
                <div className={`w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0 mt-0.5 ${isHigh ? "bg-red-50" : "bg-amber-50"}`}>
                  {isHigh
                    ? <AlertTriangle size={16} color="#dc2626" strokeWidth={2} />
                    : <Info          size={16} color="#d97706" strokeWidth={2} />}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800 m-0 mb-0.5">
                    {alert.attackType || alert.type || "Fraud Alert"}
                  </p>
                  <p className="text-[12px] text-slate-500 m-0 leading-relaxed">
                    {alert.message || alert.description}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
