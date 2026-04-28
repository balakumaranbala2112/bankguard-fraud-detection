// ── API Endpoints ─────────────────────────────────────
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

export const ENDPOINTS = {
  // Auth
  REGISTER: "/auth/register",
  LOGIN:    "/auth/login",
  PROFILE:  "/auth/profile",
  SET_PIN:  "/auth/pin",          // F19
  SESSIONS: "/auth/sessions",         // F20

  // FEATURE 10: 2FA Login
  SEND_LOGIN_OTP:   "/auth/send-login-otp",
  VERIFY_LOGIN_OTP: "/auth/verify-login-otp",

  // FEATURE 7: Push notifications
  PUSH_SUBSCRIBE: "/auth/push-subscribe",

  // Transactions
  SEND_MONEY:        "/transactions",
  CONFIRM_TXN:       "/transactions",      // + /:id/confirm
  VERIFY_OTP:        "/transactions/verify-otp",
  VERIFY_PAYMENT:    "/transactions",      // + /:id/verify
  HISTORY:           "/transactions",
  RECENT_RECIPIENTS: "/transactions/recipients",
  RECEIPT:           "/transactions",      // + /:id/receipt
  QR_CODE:           "/transactions/qr",   // F21 + /:accountNumber

  // Alerts
  ALERTS:        "/alerts",
  ALERTS_UNREAD: "/alerts/unread-count",
  ALERT_READ:    "/alerts",  // PUT /alerts/:id/read

  // Admin
  ADMIN_STATS:        "/admin/stats",
  ADMIN_USERS:        "/admin/users",
  ADMIN_TRANSACTIONS: "/admin/transactions",
  ADMIN_RETRAIN:      "/admin/retrain",       // F4
  ADMIN_APPEALS:      "/admin/appeals",       // F5
  ADMIN_AUDIT_LOGS:   "/admin/audit-logs",    // F9
  ADMIN_REPORTS:      "/admin/reports/monthly", // F13

  // FEATURE 1: SHAP Explain
  ML_EXPLAIN: "/ml/explain",

  // FEATURE 5: Appeals (user)
  APPEALS: "/appeals",

  // FEATURE 22: Contacts
  CONTACTS: "/contacts",
};


// ── Risk Levels ───────────────────────────────────────
export const RISK = {
  LOW:    "LOW",
  MEDIUM: "MEDIUM",
  HIGH:   "HIGH",
};

export const RISK_LABELS = {
  LOW:    "Safe",
  MEDIUM: "Requires Verification",
  HIGH:   "Blocked — High Risk",
};

export const RISK_COLORS = {
  LOW:    "success",
  MEDIUM: "warn",
  HIGH:   "danger",
};

// ── Attack Types ──────────────────────────────────────
export const ATTACK_TYPES = {
  NONE:                   "None",
  LARGE_AMOUNT_FRAUD:     "Large Amount Fraud",
  ACCOUNT_TAKEOVER:       "Account Takeover",
  RAPID_SUCCESSION_FRAUD: "Rapid Succession Fraud",
  ODD_HOUR_FRAUD:         "Odd Hour Fraud",
  NEW_BENEFICIARY_FRAUD:  "New Beneficiary Fraud",
  PATTERN_ANOMALY:        "Pattern Anomaly",
};

// ── Transaction Status ────────────────────────────────
export const TXN_STATUS = {
  APPROVED: "APPROVED",
  FLAGGED:  "OTP_PENDING",
  BLOCKED:  "BLOCKED",
};

export const TXN_STATUS_LABEL = {
  APPROVED:    "Approved",
  FLAGGED:     "Pending OTP",
  BLOCKED:     "Blocked",
  OTP_PENDING: "Pending OTP",
};
