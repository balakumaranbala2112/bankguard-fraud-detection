import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { adminService } from "../services/adminService";
import { PageLoader } from "@/shared/components/Loader";
import { formatCurrency, formatDateTime } from "@/shared/utils";
import { API_BASE } from "@/shared/constants";
import useSocket from "@/shared/hooks/useSocket";
import {
  Users, ArrowLeftRight, ShieldX, Wallet, RefreshCw, Loader2,
  CheckCircle, AlertTriangle, ShieldAlert, BarChart3, InboxIcon,
  BrainCircuit, Radio, FileCheck2, ClipboardList, CheckCircle2,
  XCircle, Clock, Terminal, ChevronLeft, ChevronRight,
  Lock, Activity, ShieldCheck, Code, History, TrendingUp, Grid,
  FileDown
} from "lucide-react";

import FraudHeatmap from "../components/FraudHeatmap";
import AttackTrends from "../components/AttackTrends";
import AttackSimulation from "../components/AttackSimulation";

/* ── shared table heading/cell classes ───────────────────────────── */
const TH = "px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.07em] bg-slate-50 border-b border-slate-200 whitespace-nowrap";
const TD = "px-4 py-3 text-[13px] align-middle";

const RISK_STYLES = {
  HIGH:   { bg: "#fee2e2", color: "#dc2626" },
  MEDIUM: { bg: "#fef9c3", color: "#ca8a04" },
  LOW:    { bg: "#dcfce7", color: "#16a34a" },
};

const APPEAL_STATUS_STYLE = {
  PENDING:  { bg: "#fef9c3", color: "#92400e" },
  APPROVED: { bg: "#dcfce7", color: "#166534" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b" },
};

const getAuditActionStyle = (action) => {
  if (action.startsWith("AUTH_")) return { bg: "bg-indigo-50 border-indigo-100", text: "text-indigo-700", Icon: Lock };
  if (action.startsWith("TXN_")) return { bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-700", Icon: ArrowLeftRight };
  if (action.startsWith("ADMIN_")) return { bg: "bg-amber-50 border-amber-100", text: "text-amber-700", Icon: ShieldCheck };
  return { bg: "bg-slate-50 border-slate-200", text: "text-slate-600", Icon: Activity };
};

/** Stat card component */
function StatCard({ label, value, sub, Icon, color, bg, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
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

/* ─────────────────────────────────────────────────────────────────── */

export default function AdminPage() {
  const [stats, setStats]           = useState(null);
  const [users, setUsers]           = useState([]);
  const [preds, setPreds]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("stats");

  /* Feature 4 — Retrain */
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);

  /* Feature 2 — Live feed */
  const [liveFeed, setLiveFeed]     = useState([]);

  /* Feature 5 — Appeals */
  const [appeals, setAppeals]       = useState([]);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [decideModal, setDecideModal] = useState(null); // { appeal }
  const [adminNote, setAdminNote]   = useState("");
  const [deciding, setDeciding]     = useState(false);

  /* Feature 9 — Audit Log */
  const [auditLogs, setAuditLogs]   = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage]   = useState(1);
  const [auditPagination, setAuditPagination] = useState({ total: 0, pages: 1 });

  /* ── WebSocket live feed (Feature 2) ─────────────────────────── */
  const { socketRef, connected } = useSocket();
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("join_admin");

    const onNewTxn = (txn) => {
      setLiveFeed((prev) => [txn, ...prev].slice(0, 50));
    };
    const onFraud = (txn) => {
      setLiveFeed((prev) => [txn, ...prev].slice(0, 50));
      toast.error(`🚨 Fraud alert — ${txn.riskLevel} risk transaction blocked!`, { duration: 6000 });
    };

    socket.on("new_transaction", onNewTxn);
    socket.on("fraud_alert",     onFraud);

    return () => {
      socket.off("new_transaction", onNewTxn);
      socket.off("fraud_alert",     onFraud);
    };
  }, [connected]); // re-run when connection state changes

  /* ── Initial data fetch ──────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      adminService.getStats().then((r) => setStats(r.data)).catch((e) => {
        console.error("Stats fail", e);
        setStats({
          totalUsers: 0, totalTransactions: 0, blockedCount: 0, mediumCount: 0, flaggedCount: 0,
          approvedCount: 0, totalAlerts: 0, unreadAlerts: 0, totalBlocked: 0, attackBreakdown: []
        });
      }),
      adminService.getUsers().then((r) => setUsers(r.data.users || [])).catch(() => setUsers([])),
      adminService.getTransactions().then((r) => setPreds(r.data.transactions || [])).catch(() => setPreds([])),
    ]).finally(() => setLoading(false));
  }, []);

  /* ── Appeals load (lazy on tab switch) ───────────────────────── */
  const loadAppeals = useCallback(async () => {
    setAppealsLoading(true);
    try {
      const r = await adminService.getAppeals();
      setAppeals(r.data.appeals || []);
    } catch { toast.error("Failed to load appeals"); }
    finally { setAppealsLoading(false); }
  }, []);

  /* ── Audit log load ───────────────────────────────────────────── */
  const loadAudit = useCallback(async (page = 1) => {
    setAuditLoading(true);
    try {
      const r = await adminService.getAuditLogs({ page, limit: 20 });
      setAuditLogs(r.data.logs || []);
      setAuditPagination(r.data.pagination || { total: 0, pages: 1 });
    } catch { toast.error("Failed to load audit logs"); }
    finally { setAuditLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "appeals" && appeals.length === 0) loadAppeals();
    if (tab === "audit")   loadAudit(auditPage);
  }, [tab]); // eslint-disable-line

  useEffect(() => {
    if (tab === "audit") loadAudit(auditPage);
  }, [auditPage]); // eslint-disable-line

  /* ── Retrain handler (Feature 4) ─────────────────────────────── */
  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    try {
      const r = await adminService.retrainModel();
      setRetrainResult(r.data);
      toast.success(`Model retrained in ${r.data.elapsed}s!`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Retraining failed");
      setRetrainResult(err.response?.data || null);
    } finally {
      setRetraining(false);
    }
  };

  /* ── Appeal decision handler (Feature 5) ─────────────────────── */
  const handleDecide = async (status) => {
    if (!decideModal) return;
    setDeciding(true);
    try {
      await adminService.decideAppeal(decideModal.appeal._id, { status, adminNote });
      toast.success(`Appeal ${status.toLowerCase()} successfully`);
      setDecideModal(null);
      setAdminNote("");
      await loadAppeals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Decision failed");
    } finally {
      setDeciding(false);
    }
  };

  if (loading) return <PageLoader />;

  const TABS = [
    { id: "stats",       label: "Stats",     Icon: BarChart3    },
    { id: "users",       label: "Users",     Icon: Users        },
    { id: "predictions", label: "Predict.",  Icon: BrainCircuit },
    { id: "live",        label: "Live Feed", Icon: Radio        },
    { id: "appeals",     label: "Appeals",   Icon: FileCheck2   },
    { id: "heatmap",     label: "Heatmap",   Icon: Grid         },
    { id: "trends",      label: "Trends",    Icon: TrendingUp   },
    { id: "reports",     label: "Reports",   Icon: FileDown     },
    { id: "audit",       label: "Audit Log", Icon: ClipboardList},
    { id: "simulation",  label: "Attack Lab",Icon: ShieldAlert  },
  ];

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

      {/* Retrain result banner */}
      <AnimatePresence>
        {retrainResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mb-4 rounded-xl border p-4 ${retrainResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {retrainResult.success
                ? <CheckCircle size={15} color="#16a34a" />
                : <XCircle size={15} color="#dc2626" />}
              <span className={`text-[13px] font-semibold ${retrainResult.success ? "text-green-800" : "text-red-800"}`}>
                {retrainResult.message || retrainResult.error}
              </span>
            </div>
            {retrainResult.success && retrainResult.metrics && Object.keys(retrainResult.metrics).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["accuracy", "precision", "recall", "f1", "auc"].map((k) =>
                  retrainResult.metrics[k] != null ? (
                    <div key={k} className="bg-white rounded-lg p-2.5 border border-green-100 text-center">
                      <p className="font-mono text-[16px] font-bold text-green-700">{retrainResult.metrics[k]}%</p>
                      <p className="text-[10px] uppercase tracking-wide text-green-600 font-semibold">{k}</p>
                    </div>
                  ) : null
                )}
              </div>
            )}
            {retrainResult.output && (
              <details className="mt-2">
                <summary className="text-[11px] text-slate-500 cursor-pointer flex items-center gap-1"><Terminal size={11} /> Show output</summary>
                <pre className="text-[10px] font-mono bg-slate-900 text-green-300 rounded-lg p-3 mt-1.5 overflow-x-auto whitespace-pre-wrap">{retrainResult.output}</pre>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <StatCard label="Total Users"  value={stats.totalUsers ?? users.length}   Icon={Users}          color="#2563eb" bg="#eff6ff" delay={0.06} />
          <StatCard label="Transactions" value={stats.totalTransactions ?? "—"} sub="all time" Icon={ArrowLeftRight} color="#7c3aed" bg="#f5f3ff" delay={0.08} />
          <StatCard label="Blocked"      value={stats.blockedCount ?? "—"}           Icon={ShieldX}        color="#dc2626" bg="#fef2f2" delay={0.10} />
          <StatCard label="Total Volume" value={stats.totalVolume ? formatCurrency(stats.totalVolume) : "—"} Icon={Wallet} color="#16a34a" bg="#f0fdf4" delay={0.12} />
        </div>
      )}

      {/* Tab strip */}
      <div className="flex gap-0.5 mb-4 bg-slate-100 rounded-[11px] p-1 w-fit flex-wrap">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-all
              ${tab === id ? "bg-white text-slate-900 shadow-sm" : "bg-transparent text-slate-500 hover:text-slate-900"}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── STATS TAB ── */}
      {tab === "stats" && stats && (
        <motion.div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-slate-400 px-5 pt-4 m-0">System Overview</p>
          {[
            { Icon: CheckCircle,  label: "Approved transactions",     val: stats.approvedCount ?? "—", color: "#16a34a" },
            { Icon: ShieldAlert,  label: "Medium risk (OTP required)", val: stats.mediumCount   ?? "—", color: "#d97706" },
            { Icon: ShieldX,      label: "High risk (blocked)",        val: stats.blockedCount  ?? "—", color: "#dc2626" },
            { Icon: BrainCircuit, label: "ML model accuracy",          val: stats.modelAccuracy ? `${stats.modelAccuracy}%` : "99.2%", color: "#7c3aed" },
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

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <motion.div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr>{["Name","Email","Account","Balance","Role"].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr key={u._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}>
                    <td className={`${TD} font-semibold text-slate-900`}>{u.name}</td>
                    <td className={`${TD} text-slate-500`}>{u.email}</td>
                    <td className={`${TD} font-mono text-[12px] text-slate-500`}>{u.accountNumber}</td>
                    <td className={`${TD} font-mono font-medium`}>{formatCurrency(u.balance)}</td>
                    <td className={TD}>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${u.role === "admin" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{u.role || "user"}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ── PREDICTIONS TAB ── */}
      {tab === "predictions" && (
        <motion.div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {preds.length === 0
            ? <div className="flex flex-col items-center justify-center py-14 px-5 gap-2.5"><InboxIcon size={34} color="#cbd5e1" strokeWidth={1.5} /><p className="text-[13px] text-slate-400 m-0">No prediction history available</p></div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr>{["Time","Amount","Risk","Score"].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {preds.map((p, i) => {
                      const rs = RISK_STYLES[p.riskLevel] || RISK_STYLES.LOW;
                      return (
                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className={`${TD} text-slate-400 text-[12px]`}>{formatDateTime(p.timestamp || p.createdAt)}</td>
                          <td className={`${TD} font-mono font-semibold`}>{formatCurrency(p.amount)}</td>
                          <td className={TD}><span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide" style={{ background: rs.bg, color: rs.color }}>{p.riskLevel}</span></td>
                          <td className={`${TD} font-mono text-[12px] text-slate-500`}>{p.confidence ? p.confidence.toFixed(1) : "0.0"}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </motion.div>
      )}

      {/* ── LIVE FEED TAB (Feature 2) ── */}
      {tab === "live" && (
        <motion.div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-slate-400 m-0">
              Live Transactions — {liveFeed.length} received
            </p>
          </div>
          {liveFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-5 gap-3">
              <Radio size={34} color="#cbd5e1" strokeWidth={1.5} />
              <p className="text-[13px] text-slate-400 m-0">Waiting for transactions…</p>
              <p className="text-[11px] text-slate-300 m-0">New transactions will appear here in real time</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr>{["Time","Amount","Risk","Status","Attack"].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {liveFeed.map((txn, i) => {
                    const rs  = RISK_STYLES[txn.riskLevel] || RISK_STYLES.LOW;
                    const isNew = i === 0;
                    return (
                      <motion.tr
                        key={txn._id || i}
                        className={`border-b border-slate-50 last:border-0 transition-colors ${isNew ? "bg-blue-50/40" : "hover:bg-slate-50/50"}`}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
                      >
                        <td className={`${TD} text-slate-400 text-[12px] whitespace-nowrap`}>{formatDateTime(txn.createdAt)}</td>
                        <td className={`${TD} font-mono font-semibold whitespace-nowrap`}>{formatCurrency(txn.amount)}</td>
                        <td className={TD}><span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide" style={{ background: rs.bg, color: rs.color }}>{txn.riskLevel || "—"}</span></td>
                        <td className={`${TD} text-[12px] text-slate-600 whitespace-nowrap`}>{txn.status?.replace("_", " ") || "—"}</td>
                        <td className={`${TD} text-[11px] text-slate-400`}>{txn.attackType?.replace(/_/g, " ") || "—"}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* ── APPEALS TAB (Feature 5) ── */}
      {tab === "appeals" && (
        <motion.div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-slate-400 m-0">
              Fraud Appeals — {appeals.length} total
            </p>
            <button onClick={loadAppeals} disabled={appealsLoading} className="inline-flex items-center gap-1 text-[12px] text-slate-400 hover:text-blue-600 transition-colors bg-transparent border-none cursor-pointer">
              <RefreshCw size={12} className={appealsLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {appealsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-blue-400" /></div>
          ) : appeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2.5">
              <FileCheck2 size={34} color="#cbd5e1" strokeWidth={1.5} />
              <p className="text-[13px] text-slate-400 m-0">No appeals submitted yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>{["User","Transaction","Amount","Reason","Status","Action"].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {appeals.map((a) => {
                    const ss = APPEAL_STATUS_STYLE[a.status] || APPEAL_STATUS_STYLE.PENDING;
                    return (
                      <tr key={a._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className={`${TD} font-medium text-slate-800`}>{a.userId?.name || "—"}</td>
                        <td className={`${TD} font-mono text-[11px] text-slate-400`}>{a.transactionId?._id?.slice(-8).toUpperCase() || "—"}</td>
                        <td className={`${TD} font-mono text-[13px] font-semibold`}>{formatCurrency(a.transactionId?.amount)}</td>
                        <td className={`${TD} text-slate-500 max-w-[200px] truncate`} title={a.reason}>{a.reason}</td>
                        <td className={TD}>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide" style={{ background: ss.bg, color: ss.color }}>{a.status}</span>
                        </td>
                        <td className={TD}>
                          {a.status === "PENDING" ? (
                            <button
                              onClick={() => { setDecideModal({ appeal: a }); setAdminNote(""); }}
                              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[12px] font-semibold border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
                            >
                              Decide
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">{a.adminNote || "—"}</span>
                          )}
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

      {/* ── Appeal Decision Modal ── */}
      <AnimatePresence>
        {decideModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDecideModal(null)} />
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[420px] z-10"
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            >
              <h3 className="text-[16px] font-bold text-slate-900 mb-1">Appeal Decision</h3>
              <p className="text-[13px] text-slate-500 mb-4">
                <span className="font-semibold text-slate-700">{decideModal.appeal.userId?.name}</span> appealed transaction{" "}
                <span className="font-mono">{decideModal.appeal.transactionId?._id?.slice(-8).toUpperCase()}</span> for{" "}
                <span className="font-semibold">{formatCurrency(decideModal.appeal.transactionId?.amount)}</span>.
              </p>
              <div className="bg-slate-50 rounded-xl p-3.5 mb-4 border border-slate-200">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Reason</p>
                <p className="text-[13px] text-slate-700 m-0">{decideModal.appeal.reason}</p>
              </div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">Admin note (optional)</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reason for decision…"
                rows={2}
                className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-blue-500 resize-none mb-4"
              />
              <div className="flex gap-2.5">
                <button
                  onClick={() => handleDecide("APPROVED")}
                  disabled={deciding}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[13px] font-semibold border-none cursor-pointer disabled:opacity-60"
                >
                  {deciding ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                </button>
                <button
                  onClick={() => handleDecide("REJECTED")}
                  disabled={deciding}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold border-none cursor-pointer disabled:opacity-60"
                >
                  <XCircle size={14} /> Reject
                </button>
                <button onClick={() => setDecideModal(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold border-none cursor-pointer hover:bg-slate-200">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REPORTS TAB (Feature 13) ── */}
      {tab === "reports" && (
        <motion.div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <FileDown size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 m-0">Monthly Fraud Reports</h2>
              <p className="text-[13px] text-slate-500 m-0">Download official PDF reports detailing all fraud incidents and statistics.</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Select Month</label>
                <select
                  id="report-month"
                  defaultValue={new Date().getMonth() + 1}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-900 bg-white focus:outline-none focus:border-blue-500"
                >
                  {Array.from({length: 12}).map((_, i) => (
                    <option key={i+1} value={i+1}>
                      {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Select Year</label>
                <select
                  id="report-year"
                  defaultValue={new Date().getFullYear()}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-900 bg-white focus:outline-none focus:border-blue-500"
                >
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const m = document.getElementById("report-month").value;
              const y = document.getElementById("report-year").value;
              const token = localStorage.getItem("fs_token");
              window.open(`${API_BASE}/admin/reports/monthly?month=${m}&year=${y}&token=${token}`);
              toast.success("Downloading report...");
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[14px] font-semibold transition-colors flex items-center justify-center gap-2 border-none cursor-pointer"
          >
            <FileDown size={16} /> Download PDF Report
          </button>
        </motion.div>
      )}

      {/* ── AUDIT LOG TAB (Feature 9) ── */}
      {tab === "audit" && (
        <motion.div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-slate-400 m-0">
              Audit Log — {auditPagination.total} entries
            </p>
          </div>
          {auditLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin text-blue-400" /></div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2.5">
              <ClipboardList size={34} color="#cbd5e1" strokeWidth={1.5} />
              <p className="text-[13px] text-slate-400 m-0">No audit entries yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>{["Time","User","Event Action","IP Address","Event Details"].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => {
                      const style = getAuditActionStyle(log.action);
                      const ActionIcon = style.Icon;
                      return (
                        <motion.tr
                          key={log._id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors group"
                          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        >
                          <td className={`${TD} text-slate-400 text-[12px] whitespace-nowrap`}>
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="opacity-50" /> 
                              {formatDateTime(log.createdAt)}
                            </div>
                          </td>
                          <td className={`${TD} font-medium text-slate-800`}>
                            {log.userId?.name ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 shadow-sm">
                                  {log.userId.name.slice(0, 2).toUpperCase()}
                                </div>
                                {log.userId.name}
                              </div>
                            ) : <span className="text-slate-300 ml-2">—</span>}
                          </td>
                          <td className={TD}>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${style.bg} ${style.text} whitespace-nowrap shadow-sm`}>
                              <ActionIcon size={12} strokeWidth={2.5} className="opacity-80" />
                              <span className="text-[10px] font-bold uppercase tracking-[0.05em]">{log.action.replace(/_/g, " ")}</span>
                            </div>
                          </td>
                          <td className={`${TD} font-mono text-[11px] text-slate-500`}>
                            {log.ipAddress ? (
                              <span className="px-2 py-0.5 rounded md:bg-slate-100 md:border md:border-slate-200/60 shadow-sm">{log.ipAddress}</span>
                            ) : "—"}
                          </td>
                          <td className={`${TD} py-2`}>
                            {log.details && Object.keys(log.details).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                                {Object.entries(log.details)
                                  .filter(([_, v]) => v !== null && v !== "")
                                  .slice(0, 3)
                                  .map(([k, v], idx) => (
                                  <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-slate-50 border border-slate-200 text-[10px] font-mono shadow-sm group-hover:bg-white transition-colors">
                                    <span className="text-slate-400 mr-1">{k}:</span>
                                    <span className="text-slate-700 font-semibold truncate max-w-[100px]" title={String(v)}>{String(v)}</span>
                                  </span>
                                ))}
                                {Object.keys(log.details).length > 3 && (
                                  <span className="text-[10px] text-slate-400 px-1 py-0.5 font-mono">+{Object.keys(log.details).length - 3}</span>
                                )}
                              </div>
                            ) : <span className="text-slate-300 text-[11px]">—</span>}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {auditPagination.pages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                  <span className="text-[12px] text-slate-400">Page {auditPage} of {auditPagination.pages}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-[1.5px] border-slate-200 bg-white text-[12px] font-semibold text-slate-500 cursor-pointer hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      <ChevronLeft size={13} /> Prev
                    </button>
                    <button onClick={() => setAuditPage((p) => Math.min(auditPagination.pages, p + 1))} disabled={auditPage === auditPagination.pages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-[1.5px] border-slate-200 bg-white text-[12px] font-semibold text-slate-500 cursor-pointer hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      Next <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* ── HEATMAP TAB (Feature 12) ── */}
      {tab === "heatmap" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <FraudHeatmap />
        </motion.div>
      )}

      {/* ── TRENDS TAB (Feature 15) ── */}
      {tab === "trends" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <AttackTrends />
        </motion.div>
      )}

      {/* ── SIMULATION TAB ── */}
      {tab === "simulation" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <AttackSimulation users={users} />
        </motion.div>
      )}
    </div>
  );
}
