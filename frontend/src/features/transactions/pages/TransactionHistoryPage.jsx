import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTransactions } from "../hooks/useTransactions";
import RiskBadge from "../components/RiskBadge";
import { PageLoader } from "@/shared/components/Loader";
import { formatCurrency, formatDateTime } from "@/shared/utils";
import { useAuthStore } from "@/features/auth/authSlice";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, InboxIcon } from "lucide-react";

const FILTERS = ["ALL", "APPROVED", "BLOCKED", "OTP_PENDING", "FAILED"];

const STATUS_STYLES = {
  APPROVED:    { bg: "#dcfce7", color: "#16a34a" },
  BLOCKED:     { bg: "#fee2e2", color: "#dc2626" },
  OTP_PENDING: { bg: "#fef9c3", color: "#ca8a04" },
  FAILED:      { bg: "#fee2e2", color: "#dc2626" },
};

export default function TransactionHistoryPage() {
  const { user }                                    = useAuthStore();
  const { history, loading, fetchHistory, pagination } = useTransactions();
  const [activeFilter, setActiveFilter]             = useState("ALL");
  const [page, setPage]                             = useState(1);

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

  return (
    <div className="font-sans text-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-2 flex-wrap">
        <div>
          <h1 className="text-[clamp(1.2rem,2.5vw,1.5rem)] font-bold text-slate-900 m-0">
            Transaction History
          </h1>
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
          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Date", "To / From", "Amount", "Risk", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.07em] bg-slate-50 border-b border-slate-200 whitespace-nowrap
                        first:hidden sm:first:table-cell"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((txn, i) => {
                  const uid      = user?._id || user?.id;
                  const isSent   = txn.sender?._id === uid || txn.sender === uid;
                  const other    = isSent ? txn.receiver : txn.sender;
                  const dir      = isSent ? "To" : "From";
                  const DirIcon  = isSent ? ArrowUp : ArrowDown;
                  const dotBg    = isSent ? "#eff6ff" : "#f0fdf4";
                  const dotColor = isSent ? "#2563eb" : "#16a34a";
                  const st       = STATUS_STYLES[txn.status] || { bg: "#f1f5f9", color: "#64748b" };

                  return (
                    <motion.tr
                      key={txn._id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025 }}
                    >
                      {/* Date — hidden on mobile */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-[12px] text-slate-400 whitespace-nowrap">
                          {formatDateTime(txn.createdAt)}
                        </span>
                      </td>

                      {/* To / From */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                            style={{ background: dotBg }}
                          >
                            <DirIcon size={14} color={dotColor} strokeWidth={2.5} />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-slate-800 m-0 whitespace-nowrap">
                              {dir}: {other?.name || other?.accountNumber || "—"}
                            </p>
                            {txn.note && (
                              <p className="text-[11px] text-slate-400 m-0 mt-0.5">{txn.note}</p>
                            )}
                            {/* Show date inline on mobile */}
                            <p className="text-[11px] text-slate-400 m-0 mt-0.5 sm:hidden">
                              {formatDateTime(txn.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[13px] font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(txn.amount)}
                        </span>
                      </td>

                      {/* Risk */}
                      <td className="px-4 py-3">
                        {txn.riskLevel
                          ? <RiskBadge level={txn.riskLevel} />
                          : <span className="text-slate-300">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase whitespace-nowrap"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {txn.status.replace("_", " ")}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 flex-wrap gap-2">
              <span className="text-[12px] text-slate-400">
                Page {page} of {pagination.pages}
              </span>
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
    </div>
  );
}
