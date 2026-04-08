// ── Currency ──────────────────────────────────────────
export const formatCurrency = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

// ── Date ──────────────────────────────────────────────
export const formatDate = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));

export const formatDateTime = (date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Risk level helpers ────────────────────────────────
export const getRiskBadgeClass = (level) => {
  if (level === "LOW") return "fs-badge-low";
  if (level === "MEDIUM") return "fs-badge-medium";
  if (level === "HIGH") return "fs-badge-high";
  return "fs-badge-low";
};

export const getStatusColor = (status) => {
  const map = {
    APPROVED: "text-success-600 bg-success-500/10",
    FLAGGED: "text-warn-600 bg-warn-500/10", // ← added
    BLOCKED: "text-danger-600 bg-danger-500/10",
    FAILED: "text-gray-600 bg-gray-100",
  };
  return map[status] || "text-gray-600 bg-gray-100";
};

// ── Mask account number ───────────────────────────────
export const maskAccount = (acc) => (acc ? `XXXX XXXX ${acc.slice(-4)}` : "—");

// ── Truncate text ─────────────────────────────────────
export const truncate = (str, n = 40) =>
  str && str.length > n ? `${str.slice(0, n)}…` : str;
