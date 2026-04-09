// ── API Endpoints ─────────────────────────────────────
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export const ENDPOINTS = {
  // Auth
  REGISTER: "/auth/register",
  LOGIN: "/auth/login",
  PROFILE: "/auth/profile",

  // Transactions
  SEND_MONEY: "/transactions/send",
  VERIFY_OTP: "/transactions/verify-otp",
  VERIFY_PAYMENT: "/transactions/verify-payment",
  HISTORY: "/transactions/history",

  // Alerts
  // FIX: was '/transactions/alerts' — but alertRoutes.js is mounted at
  // /api/alerts in app.js, not under /transactions. Using the wrong path
  // caused the Alerts page to 404 on every load.
  ALERTS: "/alerts",
  ALERTS_UNREAD: "/alerts/unread-count", // bonus: added for unread badge support
  ALERT_READ: "/alerts", // PUT /alerts/:id/read — append /:id/read in the call

  // Admin
  ADMIN_STATS: "/admin/stats",
  ADMIN_USERS: "/admin/users",
  ADMIN_TRANSACTIONS: "/admin/transactions",

  // FIX: RETRAIN and PREDICTIONS were pointing to routes that don't exist
  // in adminRoutes.js. Removed to avoid silent 404s.
  // Add them back once you implement those backend endpoints.
};

// ── Risk Levels ───────────────────────────────────────
export const RISK = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
};

export const RISK_LABELS = {
  LOW: "Safe",
  MEDIUM: "Requires Verification",
  HIGH: "Blocked — High Risk",
};

export const RISK_COLORS = {
  LOW: "success",
  MEDIUM: "warn",
  HIGH: "danger",
};

// ── Attack Types ──────────────────────────────────────
// FIX: synced with the actual values the backend/ML model returns.
// The old keys (CARD_FRAUD, PHISHING, etc.) don't match anything
// the backend sends — so attack type labels never displayed correctly.
export const ATTACK_TYPES = {
  NONE: "None",
  LARGE_AMOUNT_FRAUD: "Large Amount Fraud",
  ACCOUNT_TAKEOVER: "Account Takeover",
  RAPID_SUCCESSION_FRAUD: "Rapid Succession Fraud",
  ODD_HOUR_FRAUD: "Odd Hour Fraud",
  NEW_BENEFICIARY_FRAUD: "New Beneficiary Fraud",
  PATTERN_ANOMALY: "Pattern Anomaly",
};

// ── Transaction Status ────────────────────────────────
// FIX: backend only uses APPROVED, FLAGGED, BLOCKED — never PENDING or FAILED.
// Added FLAGGED so status labels render correctly in transaction history.
export const TXN_STATUS = {
  APPROVED: "APPROVED",
  FLAGGED: "OTP_PENDING",
  BLOCKED: "BLOCKED",
};

export const TXN_STATUS_LABEL = {
  APPROVED: "Approved",
  FLAGGED: "Pending OTP",
  BLOCKED: "Blocked",
};
