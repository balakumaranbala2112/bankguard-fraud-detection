import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { useTransactions } from "../hooks/useTransactions";
import RiskBadge from "../components/RiskBadge";
import { PageLoader } from "@/shared/components/Loader";
import { formatCurrency, formatDateTime } from "@/shared/utils";
import { useAuthStore } from "@/features/auth/authSlice";
import { API_BASE, ENDPOINTS } from "@/shared/constants";
import api from "@/shared/services/api";
import {
  ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  InboxIcon, Download, MessageSquareWarning, X,
  Loader2, CheckCircle2,
  Tag, Utensils, Home, ShoppingBag, Zap, GraduationCap, Cross, FileQuestion
} from "lucide-react";

const FILTERS       = ["ALL", "APPROVED", "BLOCKED", "OTP_PENDING", "FAILED"];
const STATUS_STYLES = {
  APPROVED:    { bg: "#dcfce7", color: "#16a34a" },
  BLOCKED:     { bg: "#fee2e2", color: "#dc2626" },
  OTP_PENDING: { bg: "#fef9c3", color: "#ca8a04" },
  FAILED:      { bg: "#fee2e2", color: "#dc2626" },
};

const CATEGORY_ICONS = {
  TRANSFER:  { icon: ArrowUp, color: "text-blue-500", bg: "bg-blue-50" },
  FOOD:      { icon: Utensils, color: "text-orange-500", bg: "bg-orange-50" },
  RENT:      { icon: Home, color: "text-purple-500", bg: "bg-purple-50" },
  SHOPPING:  { icon: ShoppingBag, color: "text-pink-500", bg: "bg-pink-50" },
  UTILITIES: { icon: Zap, color: "text-yellow-500", bg: "bg-yellow-50" },
  EDUCATION: { icon: GraduationCap, color: "text-indigo-500", bg: "bg-indigo-50" },
  MEDICAL:   { icon: Cross, color: "text-red-500", bg: "bg-red-50" },
  OTHER:     { icon: FileQuestion, color: "text-slate-500", bg: "bg-slate-50" },
};

// ─── Download receipt helper ────────────────────────────────────────────────
async function downloadReceipt(txnId) {
  const token = localStorage.getItem("fs_token");
  try {
    const res = await fetch(`${API_BASE}${ENDPOINTS.RECEIPT}/${txnId}/receipt`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to generate receipt");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `receipt-${txnId.slice(-8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Could not download receipt");
  }
}

// ─── Appeal Modal ──────────────────────────────────────────────────────────
function AppealModal({ txn, onClose, onSubmitted }) {
  const [reason,    setReason]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return toast.error("Please describe the reason for your appeal");
    setSubmitting(true);
    try {
      await api.post(ENDPOINTS.APPEALS, { transactionId: txn._id, reason });
      toast.success("Appeal submitted successfully");
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit appeal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[440px] z-10"
        initial={{ y: 40, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, scale: 0.96 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-slate-900 m-0">Appeal Blocked Transaction</h3>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Amount: <span className="font-semibold text-slate-700">{formatCurrency(txn.amount)}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors border-none bg-transparent cursor-pointer">
            <X size={16} color="#64748b" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
          <p className="text-[12px] text-amber-700 leading-relaxed m-0">
            <MessageSquareWarning size={12} className="inline mr-1.5 text-amber-500" />
            Explain why this transaction should not have been blocked. Our admin team will review and respond.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
              Reason for Appeal
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g. This was a legitimate payment to my verified vendor. I regularly transact this amount…"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-[13px] text-slate-900 outline-none resize-none focus:border-blue-500 transition-colors placeholder:text-slate-300"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
          >
            {submitting
              ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
              : <><CheckCircle2 size={15} /> Submit Appeal</>}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function TransactionHistoryPage() {
  const { user }                                      = useAuthStore();
  const { history, loading, fetchHistory, pagination } = useTransactions();
  const [activeFilter, setActiveFilter]               = useState("ALL");
  const [page, setPage]                               = useState(1);
  const [appealTxn, setAppealTxn]                     = useState(null); // txn being appealed
  const [downloadingId, setDownloadingId]             = useState(null);
  const [appealedIds, setAppealedIds]                 = useState(new Set());

  useEffect(() => {
    fetchHistory({ status: activeFilter === "ALL" ? undefined : activeFilter, page, limit: 10 });
  }, [activeFilter, page, fetchHistory]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "fs_token") {
        if (!e.newValue) window.location.href = "/login";
        else window.location.reload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleDownload = async (txnId) => {
    setDownloadingId(txnId);
    await downloadReceipt(txnId);
    setDownloadingId(null);
  };

  return (
    <div className="font-sans text-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-2 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.2rem,2.5vw,1.5rem)] font-bold text-slate-900 m-0">Transaction History</h1>
          <p className="text-[13px] text-slate-500 mt-1 m-0">{pagination.total ?? 0} total transactions</p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setActiveFilter(f); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px] cursor-pointer transition-all
              ${activeFilter === f
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-slate-200 text-slate-500 hover:border-blue-500 hover:text-blue-600"}`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase().replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <PageLoader />
      ) : history.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl">
          <div className="flex flex-col items-center justify-center py-16 px-5 gap-3">
            <InboxIcon size={36} color="#cbd5e1" strokeWidth={1.5} />
            <p className="text-[14px] text-slate-400 m-0">No transactions found</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Date", "To / From", "Category", "Amount", "Risk", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.07em] bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((txn, i) => {
                    const uid       = user?._id || user?.id;
                    const isSent    = txn.sender?._id === uid || txn.sender === uid;
                    const other     = isSent ? txn.receiver : txn.sender;
                    const st        = STATUS_STYLES[txn.status] || { bg: "#f1f5f9", color: "#64748b" };
                    const isBlocked = txn.status === "BLOCKED";
                    const isAppealed = appealedIds.has(txn._id);

                    return (
                      <motion.tr
                        key={`desktop-${txn._id}`}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                      >
                        <td className="px-4 py-3 align-middle">
                          <span className="text-[12px] text-slate-400 whitespace-nowrap">{formatDateTime(txn.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 align-middle font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              {isSent ? <ArrowUp size={14} className="text-slate-500" /> : <ArrowDown size={14} className="text-green-600" />}
                            </div>
                            <div>
                              <p className="text-[13px] text-slate-900 m-0">
                                {isSent ? (txn.receiver?.name || "Unknown") : (txn.sender?.name || "Unknown")}
                              </p>
                              <p className="font-mono text-[11px] text-slate-500 m-0">
                                {isSent ? txn.receiver?.accountNumber : txn.sender?.accountNumber}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {(() => {
                            const catStyle = CATEGORY_ICONS[txn.category || "TRANSFER"] || CATEGORY_ICONS.TRANSFER;
                            const Icon = catStyle.icon;
                            return (
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${catStyle.bg} ${catStyle.color} text-[10px] font-bold uppercase tracking-wider`}>
                                <Icon size={12} /> {(txn.category || "TRANSFER").toLowerCase()}
                              </div>
                            );
                          })()}
                        </td>
                        <td className={`px-4 py-3 align-middle font-mono font-bold text-[14px] ${isSent ? "text-slate-900" : "text-green-600"}`}>
                          <span className="whitespace-nowrap">{formatCurrency(txn.amount)}</span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {txn.riskLevel ? <RiskBadge level={txn.riskLevel} /> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase whitespace-nowrap" style={{ background: st.bg, color: st.color }}>
                            {txn.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {txn.status === "APPROVED" && (
                              <button onClick={() => handleDownload(txn._id)} disabled={downloadingId === txn._id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all cursor-pointer disabled:opacity-50">
                                {downloadingId === txn._id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} PDF
                              </button>
                            )}
                            {isBlocked && isSent && !isAppealed && (
                              <button onClick={() => setAppealTxn(txn)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer">
                                <MessageSquareWarning size={11} /> Appeal
                              </button>
                            )}
                            {isBlocked && isSent && isAppealed && (
                              <span className="text-[11px] text-slate-400 italic">Appealed</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="flex flex-col md:hidden">
              {history.map((txn, i) => {
                const uid       = user?._id || user?.id;
                const isSent    = txn.sender?._id === uid || txn.sender === uid;
                const other     = isSent ? txn.receiver : txn.sender;
                const dir       = isSent ? "To" : "From";
                const DirIcon   = isSent ? ArrowUp : ArrowDown;
                const dotBg     = isSent ? "#eff6ff" : "#f0fdf4";
                const dotColor  = isSent ? "#2563eb" : "#16a34a";
                const st        = STATUS_STYLES[txn.status] || { bg: "#f1f5f9", color: "#64748b" };
                const isBlocked = txn.status === "BLOCKED";
                const isAppealed = appealedIds.has(txn._id);

                return (
                  <motion.div
                    key={`mobile-${txn._id}`}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:px-5 sm:py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                  >
                    {/* Left: Icon */}
                    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5" style={{ background: dotBg }}>
                      <DirIcon size={18} color={dotColor} strokeWidth={2.5} />
                    </div>
                    
                    {/* Middle & Right Content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      {/* Row 1: Name and Amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-semibold text-slate-900 m-0 truncate">
                            {other?.name || other?.accountNumber || "Unknown"}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400 m-0">
                            {other?.accountNumber || ""}
                          </p>
                        </div>
                        <p className={`font-mono text-[14px] font-bold m-0 shrink-0 ${isSent ? "text-slate-900" : "text-green-600"}`}>
                          {formatCurrency(txn.amount)}
                        </p>
                      </div>
                      
                      {/* Row 2: Date, Category, and Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[12px] text-slate-500 m-0 whitespace-nowrap">
                            {dir} • {formatDateTime(txn.createdAt)}
                          </p>
                          <span className="text-slate-200 hidden sm:inline">•</span>
                          {/* Category Pill */}
                          {(() => {
                            const catStyle = CATEGORY_ICONS[txn.category || "TRANSFER"] || CATEGORY_ICONS.TRANSFER;
                            const CatIcon = catStyle.icon;
                            return (
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${catStyle.bg} ${catStyle.color} text-[10px] font-bold uppercase tracking-wider`}>
                                <CatIcon size={11} /> {(txn.category || "TRANSFER").toLowerCase()}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {txn.riskLevel && <RiskBadge level={txn.riskLevel} />}
                          <span className="text-[10px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                            {txn.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      
                      {/* Row 3: Actions (if any) */}
                      { (txn.status === "APPROVED" || (isBlocked && isSent)) && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100/60">
                          {txn.status === "APPROVED" && (
                            <button onClick={() => handleDownload(txn._id)} disabled={downloadingId === txn._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all cursor-pointer disabled:opacity-50">
                              {downloadingId === txn._id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF Receipt
                            </button>
                          )}
                          {isBlocked && isSent && !isAppealed && (
                            <button onClick={() => setAppealTxn(txn)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer">
                              <MessageSquareWarning size={12} /> Appeal Block
                            </button>
                          )}
                          {isBlocked && isSent && isAppealed && (
                            <span className="text-[11px] text-slate-400 italic">Appeal pending review</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 flex-wrap gap-2">
              <span className="text-[12px] text-slate-400">Page {page} of {pagination.pages}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-[1.5px] border-slate-200 bg-white text-[12px] font-semibold text-slate-500 cursor-pointer hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-[1.5px] border-slate-200 bg-white text-[12px] font-semibold text-slate-500 cursor-pointer hover:border-blue-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Appeal Modal */}
      <AnimatePresence>
        {appealTxn && (
          <AppealModal
            key={appealTxn._id}
            txn={appealTxn}
            onClose={() => setAppealTxn(null)}
            onSubmitted={() => setAppealedIds((s) => new Set([...s, appealTxn._id]))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
