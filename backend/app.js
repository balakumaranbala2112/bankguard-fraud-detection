const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// ── Routes (existing) ──────────────────────────────────────────────────────
const authRoutes = require("./src/routes/authRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const alertRoutes = require("./src/routes/alertRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

// ── Routes (new features) ──
const mlRoutes = require("./src/routes/mlRoutes");        // F1: SHAP
const appealRoutes = require("./src/routes/appealRoutes");    // F5: Appeals
const contactRoutes = require("./src/routes/contactRoutes");   // F22: Contacts
const analyticsRoutes = require("./src/routes/analyticsRoutes"); // F14: Analytics

// ── Middleware ─────────────────────────────────────────────────────────────
const { apiLimiter, transactionLimiter } = require("./src/middleware/rateLimiter");
const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();

// CORS
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:3000",
    ].filter(Boolean),
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// ── Rate limiting ──────────────────────────────────────────────────────────
app.use("/api/v1", apiLimiter);
app.use("/api/v1/transactions", transactionLimiter);

// ── Mount routes ───────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/alerts", alertRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/ml", mlRoutes);        // F1: SHAP explain
app.use("/api/v1/appeals", appealRoutes);    // F5: Fraud appeals
app.use("/api/v1/contacts", contactRoutes);   // F22: Contact book
app.use("/api/v1/analytics", analyticsRoutes); // F14: Spending analytics

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: "ok",
    db: dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected",
    features: [
      "shap_explain", "websocket", "geolocation", "model_retrain",
      "appeal_system", "email_notifications", "push_notifications",
      "pdf_receipts", "audit_log", "2fa_login",
      "gauge_chart", "fraud_heatmap", "monthly_reports", "spending_analytics",
      "attack_trends", "device_fingerprint", "ip_blacklisting", "login_lockout",
      "transaction_pin", "session_management", "qr_payments", "contact_book",
      "categories", "dark_mode", "transaction_limits",
    ],
  });
});


// ── 404 handler 
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Error middleware (must be last) ───────────────────────────────────────
app.use(errorMiddleware);

module.exports = app;
