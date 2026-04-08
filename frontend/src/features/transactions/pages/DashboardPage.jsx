import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ArrowUpRight,
  ShieldOff,
  Activity,
  Bell,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  AlertTriangle,
  Info,
  Send,
  MapPin,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useAlerts } from "@/features/alerts/hooks/useAlerts";
import { PageLoader } from "@/shared/components/Loader";
import RiskBadge from "@/features/transactions/components/RiskBadge";
import { formatCurrency, formatDateTime, getStatusColor } from "@/shared/utils";

/* ─── helpers ─────────────────────────────────────── */
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
  txns.forEach((t) => {
    if (counts[t.riskLevel] !== undefined) counts[t.riskLevel]++;
  });
  return [
    { name: "Low", value: counts.LOW, color: "#16a34a" },
    { name: "Medium", value: counts.MEDIUM, color: "#d97706" },
    { name: "High", value: counts.HIGH, color: "#dc2626" },
  ].filter((d) => d.value > 0);
}

/* ─── Tooltip ─────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0f172a",
        color: "#f8fafc",
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      }}
    >
      <p
        style={{
          color: "#94a3b8",
          marginBottom: 4,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: 0, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── StatCard ────────────────────────────────────── */
function StatCard({ label, value, sub, Icon, color, bg, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Icon size={18} color={color} strokeWidth={2} />
      </div>
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 26,
          fontWeight: 600,
          color: "#0f172a",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#64748b",
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{sub}</p>
      )}
    </motion.div>
  );
}

/* ─── Dashboard ───────────────────────────────────── */
export default function DashboardPage() {
  const { user, refreshProfile } = useAuth();
  const { history, loading: txnLoading, fetchHistory } = useTransactions();
  const { alerts, loading: alertLoading, fetchAlerts } = useAlerts();

  useEffect(() => {
    refreshProfile();
    fetchHistory({ limit: 20 });
    fetchAlerts();
  }, []);

  const loading = txnLoading || alertLoading;

  const totalTxns = history.length;
  const approved = history.filter((t) => t.status === "APPROVED").length;
  const blocked = history.filter((t) => t.status === "BLOCKED").length;
  const highAlerts = alerts.filter(
    (a) => (a.severity || a.riskLevel) === "HIGH",
  ).length;
  const areaData = buildAreaData(history);
  const pieData = buildPieData(history);
  const recent = history.slice(0, 5);

  if (loading && history.length === 0) return <PageLoader />;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

        .dash { font-family: 'DM Sans', sans-serif; background: #f1f5f9; min-height: 100vh; color: #0f172a; }
        .dash-inner { max-width: 1080px; margin: 0 auto; padding: 28px 20px 60px; }

        .dash-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .dash-greeting { font-size: clamp(1.2rem, 2.5vw, 1.55rem); font-weight: 700; color: #0f172a; margin: 0; }
        .dash-sub { font-size: 13px; color: #64748b; margin: 3px 0 0; }

        .send-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: #2563eb; color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600; padding: 9px 18px; border-radius: 10px;
          text-decoration: none; white-space: nowrap;
          transition: background 0.15s, box-shadow 0.15s;
          box-shadow: 0 1px 3px rgba(37,99,235,0.3);
        }
        .send-btn:hover { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.35); }

        .balance-card {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%);
          border-radius: 18px; padding: 28px; margin-bottom: 20px; color: #fff;
          position: relative; overflow: hidden;
        }
        .balance-card::after {
          content: ''; position: absolute; top: -50px; right: -50px;
          width: 220px; height: 220px; border-radius: 50%;
          background: rgba(255,255,255,0.07); pointer-events: none;
        }
        .balance-card::before {
          content: ''; position: absolute; bottom: -30px; right: 80px;
          width: 120px; height: 120px; border-radius: 50%;
          background: rgba(255,255,255,0.04); pointer-events: none;
        }
        .balance-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin: 0 0 8px; }
        .balance-amount { font-family: 'DM Mono', monospace; font-size: clamp(1.9rem, 5vw, 2.8rem); font-weight: 500; margin: 0 0 22px; line-height: 1; }
        .balance-meta { display: flex; flex-wrap: wrap; gap: 24px; }
        .bm-item span:first-child { display: flex; align-items: center; gap: 4px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 4px; }
        .bm-item span:last-child  { font-family: 'DM Mono', monospace; font-size: 13px; color: rgba(255,255,255,0.88); }

        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 20px; }
        @media(min-width: 640px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }

        .charts-grid { display: grid; gap: 14px; margin-bottom: 20px; }
        @media(min-width: 720px) { .charts-grid { grid-template-columns: 1fr 320px; } }

        .chart-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; }
        .card-title { font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 16px; }

        .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 20px; }
        .card-head { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #f1f5f9; }
        .card-head-title { font-size: 14px; font-weight: 600; color: #0f172a; margin: 0; }
        .link-all { font-size: 12px; font-weight: 600; color: #2563eb; text-decoration: none; display: inline-flex; align-items: center; gap: 1px; }
        .link-all:hover { text-decoration: underline; }

        .txn-row { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #f8fafc; transition: background 0.1s; }
        .txn-row:last-child { border-bottom: none; }
        .txn-row:hover { background: #fafbfc; }
        .txn-dot { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .txn-info { flex: 1; min-width: 0; }
        .txn-name { font-size: 13px; font-weight: 500; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; }
        .txn-time { font-size: 11px; color: #94a3b8; margin: 2px 0 0; }
        .txn-right { text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
        .txn-amount { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: #0f172a; margin: 0; }
        .status-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; }
        .tag-ok   { background: #dcfce7; color: #16a34a; }
        .tag-bad  { background: #fee2e2; color: #dc2626; }
        .tag-pend { background: #fef9c3; color: #ca8a04; }

        .alert-row { display: flex; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #f8fafc; }
        .alert-row:last-child { border-bottom: none; }
        .alert-icon-wrap { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .alert-title { font-size: 13px; font-weight: 600; color: #1e293b; margin: 0 0 3px; }
        .alert-msg   { font-size: 12px; color: #64748b; margin: 0; line-height: 1.5; }

        .empty-state { padding: 36px 20px; text-align: center; font-size: 13px; color: #94a3b8; }
        .empty-state a { color: #2563eb; }
        .chart-empty { display: flex; align-items: center; justify-content: center; height: 160px; font-size: 13px; color: #94a3b8; font-style: italic; }
      `}</style>

      <div className="dash">
        <div className="dash-inner">
          {/* ── Topbar ── */}
          <div className="dash-topbar">
            <div>
              <h1 className="dash-greeting">
                {greeting}, {user?.name?.split(" ")[0]}
              </h1>
              <p className="dash-sub">Here's your fraud shield overview</p>
            </div>
            <Link to="/send" className="send-btn">
              <Send size={14} strokeWidth={2.5} />
              Send Money
            </Link>
          </div>

          {/* ── Balance ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="balance-card"
          >
            <p className="balance-label">Available Balance</p>
            <p className="balance-amount">
              {formatCurrency(user?.balance || 0)}
            </p>
            <div className="balance-meta">
              <div className="bm-item">
                <span>
                  <CreditCard size={9} />
                  Account
                </span>
                <span>{user?.accountNumber || "—"}</span>
              </div>
              <div className="bm-item">
                <span>
                  <MapPin size={9} />
                  Location
                </span>
                <span>{user?.usualLocation || "Chennai"}</span>
              </div>
            </div>
          </motion.div>

          {/* ── Stats ── */}
          <div className="stats-grid">
            <StatCard
              label="Transactions"
              value={totalTxns}
              sub="last 20 loaded"
              Icon={Activity}
              color="#2563eb"
              bg="#eff6ff"
              delay={0.07}
            />
            <StatCard
              label="Approved"
              value={approved}
              sub="successful"
              Icon={ArrowUpRight}
              color="#16a34a"
              bg="#f0fdf4"
              delay={0.09}
            />
            <StatCard
              label="Blocked"
              value={blocked}
              sub="high-risk"
              Icon={ShieldOff}
              color="#dc2626"
              bg="#fef2f2"
              delay={0.11}
            />
            <StatCard
              label="Alerts"
              value={highAlerts}
              sub="high severity"
              Icon={Bell}
              color="#d97706"
              bg="#fffbeb"
              delay={0.13}
            />
          </div>

          {/* ── Charts ── */}
          <div className="charts-grid">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="chart-card"
            >
              <p className="card-title">Transaction Activity — Last 7 Days</p>
              {areaData.length === 0 ? (
                <div className="chart-empty">
                  No activity yet — make a transaction!
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={196}>
                  <AreaChart data={areaData}>
                    <defs>
                      <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#2563eb"
                          stopOpacity={0.18}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#dc2626"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="100%"
                          stopColor="#dc2626"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 11,
                        fill: "#94a3b8",
                        fontFamily: "DM Sans",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "#94a3b8",
                        fontFamily: "DM Sans",
                      }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="approved"
                      name="Approved"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#ga)"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="blocked"
                      name="Blocked"
                      stroke="#dc2626"
                      strokeWidth={2}
                      fill="url(#gb)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.19 }}
              className="chart-card"
            >
              <p className="card-title">Risk Distribution</p>
              {pieData.length === 0 ? (
                <div className="chart-empty">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={196}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="42%"
                      innerRadius={48}
                      outerRadius={70}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(v) => (
                        <span
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            fontFamily: "DM Sans",
                          }}
                        >
                          {v}
                        </span>
                      )}
                    />
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
            className="table-card"
          >
            <div className="card-head">
              <p className="card-head-title">Recent Transactions</p>
              <Link to="/history" className="link-all">
                View all <ChevronRight size={13} />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="empty-state">
                No transactions yet. <Link to="/send">Send money</Link> to get
                started.
              </div>
            ) : (
              recent.map((txn, i) => {
                const uid = user?._id || user?.id;
                const isSent = txn.sender?._id === uid || txn.sender === uid;
                const other = isSent ? txn.receiver : txn.sender;
                const dir = isSent ? "To" : "From";
                const isOk = txn.status === "APPROVED";
                const isBad = txn.status === "BLOCKED";
                const DirIcon = isSent ? ArrowUp : ArrowDown;
                const dotBg = isOk ? "#f0fdf4" : isBad ? "#fef2f2" : "#fffbeb";
                const dotColor = isOk
                  ? "#16a34a"
                  : isBad
                    ? "#dc2626"
                    : "#d97706";
                const tagCls = isOk ? "tag-ok" : isBad ? "tag-bad" : "tag-pend";

                return (
                  <motion.div
                    key={txn._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.24 + i * 0.04 }}
                    className="txn-row"
                  >
                    <div className="txn-dot" style={{ background: dotBg }}>
                      <DirIcon size={16} color={dotColor} strokeWidth={2.5} />
                    </div>
                    <div className="txn-info">
                      <p className="txn-name">
                        {dir}: {other?.name || other?.accountNumber || "—"}
                      </p>
                      <p className="txn-time">
                        {formatDateTime(txn.createdAt)}
                      </p>
                    </div>
                    {txn.riskLevel && <RiskBadge level={txn.riskLevel} />}
                    <div className="txn-right">
                      <p className="txn-amount">{formatCurrency(txn.amount)}</p>
                      <span className={`status-tag ${tagCls}`}>
                        {txn.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>

          {/* ── Alerts ── */}
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="table-card"
            >
              <div className="card-head">
                <p className="card-head-title">Latest Alerts</p>
                <Link to="/alerts" className="link-all">
                  View all <ChevronRight size={13} />
                </Link>
              </div>
              {alerts.slice(0, 3).map((alert) => {
                const isHigh = (alert.severity || alert.riskLevel) === "HIGH";
                return (
                  <div key={alert._id} className="alert-row">
                    <div
                      className="alert-icon-wrap"
                      style={{ background: isHigh ? "#fef2f2" : "#fffbeb" }}
                    >
                      {isHigh ? (
                        <AlertTriangle
                          size={16}
                          color="#dc2626"
                          strokeWidth={2}
                        />
                      ) : (
                        <Info size={16} color="#d97706" strokeWidth={2} />
                      )}
                    </div>
                    <div>
                      <p className="alert-title">
                        {alert.attackType || alert.type || "Fraud Alert"}
                      </p>
                      <p className="alert-msg">
                        {alert.message || alert.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
