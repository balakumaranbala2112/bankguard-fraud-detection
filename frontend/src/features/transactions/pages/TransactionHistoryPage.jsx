import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTransactions } from "../hooks/useTransactions";
import RiskBadge from "../components/RiskBadge";
import { PageLoader } from "@/shared/components/Loader";
import { formatCurrency, formatDateTime, getStatusColor } from "@/shared/utils";
import { useAuthStore } from "@/features/auth/authSlice";
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  InboxIcon,
} from "lucide-react";

const FILTERS = ["ALL", "APPROVED", "BLOCKED", "OTP_PENDING", "FAILED"];

const STATUS_STYLES = {
  APPROVED: { bg: "#dcfce7", color: "#16a34a" },
  BLOCKED: { bg: "#fee2e2", color: "#dc2626" },
  OTP_PENDING: { bg: "#fef9c3", color: "#ca8a04" },
  FAILED: { bg: "#fee2e2", color: "#dc2626" },
};

export default function TransactionHistoryPage() {
  const { user } = useAuthStore();
  const { history, loading, fetchHistory, pagination } = useTransactions();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchHistory({
      status: activeFilter === "ALL" ? undefined : activeFilter,
      page,
      limit: 10,
    });
  }, [activeFilter, page, fetchHistory]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "fs_token") {
        if (!e.newValue) window.location.href = "/login";
        else window.location.reload();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .th-root { font-family: 'DM Sans', sans-serif; color: #0f172a; }

        .th-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 8px; }
        .th-title  { font-size: clamp(1.2rem, 2.5vw, 1.5rem); font-weight: 700; color: #0f172a; margin: 0; }
        .th-sub    { font-size: 13px; color: #64748b; margin: 4px 0 0; }

        /* Filter pills */
        .th-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
        .th-filter {
          padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer; border: 1.5px solid #e2e8f0;
          background: #fff; color: #64748b; transition: all 0.12s;
        }
        .th-filter:hover  { border-color: #2563eb; color: #2563eb; }
        .th-filter.active { background: #2563eb; border-color: #2563eb; color: #fff; }

        /* Card wrapper */
        .th-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }

        /* Table */
        .th-table { width: 100%; border-collapse: collapse; }
        .th-thead th {
          padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700;
          color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em;
          background: #f8fafc; border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }
        .th-row { transition: background 0.1s; border-bottom: 1px solid #f8fafc; }
        .th-row:last-child { border-bottom: none; }
        .th-row:hover { background: #fafbfc; }
        .th-td { padding: 13px 16px; vertical-align: middle; }

        /* Direction icon */
        .th-dir-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .th-counterparty { font-size: 13px; font-weight: 500; color: #1e293b; margin: 0; white-space: nowrap; }
        .th-note         { font-size: 11px; color: #94a3b8; margin: 2px 0 0; }
        .th-date         { font-size: 12px; color: #94a3b8; white-space: nowrap; }
        .th-amount       { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; }
        .th-status-pill  { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }

        /* Empty */
        .th-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 20px; gap: 12px; }
        .th-empty p { font-size: 14px; color: #94a3b8; margin: 0; }

        /* Pagination */
        .th-pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; gap: 8px; }
        .th-page-info  { font-size: 12px; color: #94a3b8; }
        .th-page-btns  { display: flex; gap: 6px; }
        .th-page-btn {
          display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
          border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: #475569;
          cursor: pointer; transition: all 0.12s;
        }
        .th-page-btn:hover:not(:disabled) { border-color: #2563eb; color: #2563eb; }
        .th-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Responsive scroll */
        .th-scroll { overflow-x: auto; }

        @media (max-width: 640px) {
          .th-thead th:nth-child(1),
          .th-td:nth-child(1) { display: none; }
        }
      `}</style>

      <div className="th-root">
        {/* Header */}
        <div className="th-header">
          <div>
            <h1 className="th-title">Transaction History</h1>
            <p className="th-sub">{pagination.total ?? 0} total transactions</p>
          </div>
        </div>

        {/* Filters */}
        <div className="th-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`th-filter${activeFilter === f ? " active" : ""}`}
              onClick={() => {
                setActiveFilter(f);
                setPage(1);
              }}
            >
              {f === "ALL"
                ? "All"
                : f.charAt(0) + f.slice(1).toLowerCase().replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <PageLoader />
        ) : history.length === 0 ? (
          <div className="th-card">
            <div className="th-empty">
              <InboxIcon size={36} color="#cbd5e1" strokeWidth={1.5} />
              <p>No transactions found</p>
            </div>
          </div>
        ) : (
          <div className="th-card">
            <div className="th-scroll">
              <table className="th-table">
                <thead className="th-thead">
                  <tr>
                    <th>Date</th>
                    <th>To / From</th>
                    <th>Amount</th>
                    <th>Risk</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((txn, i) => {
                    const uid = user?._id || user?.id;
                    const isSent =
                      txn.sender?._id === uid || txn.sender === uid;
                    const other = isSent ? txn.receiver : txn.sender;
                    const dir = isSent ? "To" : "From";
                    const DirIcon = isSent ? ArrowUp : ArrowDown;
                    const dotBg = isSent ? "#eff6ff" : "#f0fdf4";
                    const dotColor = isSent ? "#2563eb" : "#16a34a";
                    const st = STATUS_STYLES[txn.status] || {
                      bg: "#f1f5f9",
                      color: "#64748b",
                    };

                    return (
                      <motion.tr
                        key={txn._id}
                        className="th-row"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.025 }}
                      >
                        {/* Date */}
                        <td className="th-td">
                          <span className="th-date">
                            {formatDateTime(txn.createdAt)}
                          </span>
                        </td>

                        {/* To/From */}
                        <td className="th-td">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              className="th-dir-icon"
                              style={{ background: dotBg }}
                            >
                              <DirIcon
                                size={14}
                                color={dotColor}
                                strokeWidth={2.5}
                              />
                            </div>
                            <div>
                              <p className="th-counterparty">
                                {dir}:{" "}
                                {other?.name || other?.accountNumber || "—"}
                              </p>
                              {txn.note && (
                                <p className="th-note">{txn.note}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="th-td">
                          <span className="th-amount">
                            {formatCurrency(txn.amount)}
                          </span>
                        </td>

                        {/* Risk */}
                        <td className="th-td">
                          {txn.riskLevel ? (
                            <RiskBadge level={txn.riskLevel} />
                          ) : (
                            <span style={{ color: "#cbd5e1" }}>—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="th-td">
                          <span
                            className="th-status-pill"
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
              <div className="th-pagination">
                <span className="th-page-info">
                  Page {page} of {pagination.pages}
                </span>
                <div className="th-page-btns">
                  <button
                    className="th-page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={13} />
                    Prev
                  </button>
                  <button
                    className="th-page-btn"
                    onClick={() =>
                      setPage((p) => Math.min(pagination.pages, p + 1))
                    }
                    disabled={page === pagination.pages}
                  >
                    Next
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
