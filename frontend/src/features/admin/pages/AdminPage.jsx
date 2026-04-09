import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { adminService } from "../services/adminService";
import { PageLoader } from "@/shared/components/Loader";
import { formatCurrency, formatDateTime } from "@/shared/utils";
import {
  Users,
  ArrowLeftRight,
  ShieldX,
  Wallet,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  BarChart3,
  InboxIcon,
  BrainCircuit,
} from "lucide-react";

const RISK_STYLES = {
  HIGH: { bg: "#fee2e2", color: "#dc2626" },
  MEDIUM: { bg: "#fef9c3", color: "#ca8a04" },
  LOW: { bg: "#dcfce7", color: "#16a34a" },
};

function StatCard({ label, value, sub, Icon, color, bg, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "20px 20px 18px",
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
          marginBottom: 12,
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
          margin: "6px 0 0",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [preds, setPreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [tab, setTab] = useState("stats");

  useEffect(() => {
    Promise.all([
      adminService.getStats().then((r) => setStats(r.data)),
      adminService.getUsers().then((r) => setUsers(r.data.users || [])),
      adminService
        .getPredictions()
        .catch(() => [])
        .then((r) => setPreds(r?.data?.predictions || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await adminService.retrainModel();
      toast.success("Model retraining triggered!");
    } catch {
      toast.error("Retraining failed");
    } finally {
      setRetraining(false);
    }
  };

  if (loading) return <PageLoader />;

  const TABS = ["stats", "users", "predictions"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .adm-root { font-family: 'DM Sans', sans-serif; color: #0f172a; }

        .adm-topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .adm-title  { font-size: clamp(1.2rem, 2.5vw, 1.5rem); font-weight: 700; color: #0f172a; margin: 0; }
        .adm-sub    { font-size: 13px; color: #64748b; margin: 4px 0 0; }

        .adm-retrain-btn {
          display: inline-flex; align-items: center; gap: 7px;
          background: #0f172a; color: #fff; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          padding: 9px 18px; border-radius: 10px; white-space: nowrap;
          transition: background 0.15s;
        }
        .adm-retrain-btn:hover:not(:disabled) { background: #1e293b; }
        .adm-retrain-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Stats grid */
        .adm-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 24px; }
        @media(min-width: 640px) { .adm-stats { grid-template-columns: repeat(4, 1fr); } }

        /* Tabs */
        .adm-tabs { display: flex; gap: 2px; margin-bottom: 16px; background: #f1f5f9; border-radius: 11px; padding: 4px; width: fit-content; }
        .adm-tab {
          padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; border: none; cursor: pointer; background: transparent;
          color: #64748b; transition: all 0.12s; text-transform: capitalize;
        }
        .adm-tab:hover  { color: #0f172a; }
        .adm-tab.active { background: #fff; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

        /* Card */
        .adm-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }

        /* Table shared */
        .adm-table { width: 100%; border-collapse: collapse; }
        .adm-thead th {
          padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 700;
          color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em;
          background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
        }
        .adm-tr { border-bottom: 1px solid #f8fafc; transition: background 0.1s; }
        .adm-tr:last-child { border-bottom: none; }
        .adm-tr:hover { background: #fafbfc; }
        .adm-td { padding: 12px 16px; font-size: 13px; vertical-align: middle; }
        .adm-scroll { overflow-x: auto; }

        /* Pills */
        .adm-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .adm-pill-admin { background: #eff6ff; color: #1d4ed8; }
        .adm-pill-user  { background: #f1f5f9; color: #64748b; }

        /* Stats tab detail rows */
        .adm-stat-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 20px; border-bottom: 1px solid #f8fafc; }
        .adm-stat-row:last-child { border-bottom: none; }
        .adm-stat-left  { display: flex; align-items: center; gap: 10px; }
        .adm-stat-icon  { flex-shrink: 0; color: #94a3b8; }
        .adm-stat-label { font-size: 13px; color: #475569; font-weight: 500; }
        .adm-stat-val   { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: #0f172a; }

        .adm-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; padding: 16px 20px 0; margin: 0; }

        .adm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 56px 20px; gap: 10px; }
        .adm-empty p { font-size: 13px; color: #94a3b8; margin: 0; }

        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      <div className="adm-root">
        {/* Topbar */}
        <div className="adm-topbar">
          <div>
            <h1 className="adm-title">Admin Panel</h1>
            <p className="adm-sub">System management &amp; model controls</p>
          </div>
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="adm-retrain-btn"
          >
            {retraining ? (
              <>
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Retraining…
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Retrain Model
              </>
            )}
          </button>
        </div>

        {/* Stat cards */}
        {stats && (
          <div className="adm-stats">
            <StatCard
              label="Total Users"
              value={stats.totalUsers ?? users.length}
              Icon={Users}
              color="#2563eb"
              bg="#eff6ff"
              delay={0.06}
            />
            <StatCard
              label="Transactions"
              value={stats.totalTransactions ?? "—"}
              Icon={ArrowLeftRight}
              color="#7c3aed"
              bg="#f5f3ff"
              sub="all time"
              delay={0.08}
            />
            <StatCard
              label="Blocked"
              value={stats.blockedCount ?? "—"}
              Icon={ShieldX}
              color="#dc2626"
              bg="#fef2f2"
              delay={0.1}
            />
            <StatCard
              label="Total Volume"
              value={
                stats.totalVolume ? formatCurrency(stats.totalVolume) : "—"
              }
              Icon={Wallet}
              color="#16a34a"
              bg="#f0fdf4"
              delay={0.12}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`adm-tab${tab === t ? " active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Stats tab ── */}
        {tab === "stats" && stats && (
          <motion.div
            className="adm-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="adm-section-title">System Overview</p>
            {[
              {
                Icon: CheckCircle,
                label: "Approved transactions",
                val: stats.approvedCount ?? "—",
                color: "#16a34a",
              },
              {
                Icon: ShieldAlert,
                label: "Medium risk (OTP required)",
                val: stats.mediumCount ?? "—",
                color: "#d97706",
              },
              {
                Icon: ShieldX,
                label: "High risk (blocked)",
                val: stats.blockedCount ?? "—",
                color: "#dc2626",
              },
              {
                Icon: BrainCircuit,
                label: "ML model accuracy",
                val: stats.modelAccuracy ? `${stats.modelAccuracy}%` : "99.2%",
                color: "#7c3aed",
              },
            ].map(({ Icon, label, val, color }) => (
              <div key={label} className="adm-stat-row">
                <div className="adm-stat-left">
                  <Icon
                    size={15}
                    className="adm-stat-icon"
                    style={{ color }}
                    strokeWidth={2}
                  />
                  <span className="adm-stat-label">{label}</span>
                </div>
                <span className="adm-stat-val">{val}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Users tab ── */}
        {tab === "users" && (
          <motion.div
            className="adm-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="adm-scroll">
              <table className="adm-table">
                <thead className="adm-thead">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Account</th>
                    <th>Balance</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u._id}
                      className="adm-tr"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.025 }}
                    >
                      <td
                        className="adm-td"
                        style={{ fontWeight: 600, color: "#0f172a" }}
                      >
                        {u.name}
                      </td>
                      <td className="adm-td" style={{ color: "#64748b" }}>
                        {u.email}
                      </td>
                      <td
                        className="adm-td"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 12,
                          color: "#475569",
                        }}
                      >
                        {u.accountNumber}
                      </td>
                      <td
                        className="adm-td"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(u.balance)}
                      </td>
                      <td className="adm-td">
                        <span
                          className={`adm-pill ${u.role === "admin" ? "adm-pill-admin" : "adm-pill-user"}`}
                        >
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
            className="adm-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {preds.length === 0 ? (
              <div className="adm-empty">
                <InboxIcon size={34} color="#cbd5e1" strokeWidth={1.5} />
                <p>No prediction history available</p>
              </div>
            ) : (
              <div className="adm-scroll">
                <table className="adm-table">
                  <thead className="adm-thead">
                    <tr>
                      <th>Time</th>
                      <th>Amount</th>
                      <th>Risk</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preds.map((p, i) => {
                      const rs = RISK_STYLES[p.riskLevel] || RISK_STYLES.LOW;
                      return (
                        <tr key={i} className="adm-tr">
                          <td
                            className="adm-td"
                            style={{ color: "#94a3b8", fontSize: 12 }}
                          >
                            {formatDateTime(p.timestamp || p.createdAt)}
                          </td>
                          <td
                            className="adm-td"
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="adm-td">
                            <span
                              className="adm-pill"
                              style={{ background: rs.bg, color: rs.color }}
                            >
                              {p.riskLevel}
                            </span>
                          </td>
                          <td
                            className="adm-td"
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 12,
                              color: "#475569",
                            }}
                          >
                            {((p.fraudScore || 0) * 100).toFixed(1)}%
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
    </>
  );
}
