const express = require("express");
const cors = require("cors");

// Routes
const authRoutes = require("./src/routes/authRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes");
const alertRoutes = require("./src/routes/alertRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

// Middleware
const {
  apiLimiter,
  transactionLimiter,
} = require("./src/middleware/rateLimiter");
const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Body parser
app.use(express.json());

// --------------------------------------------------------
// Routes
// --------------------------------------------------------

// Global limiter
app.use("/api", apiLimiter);

// Auth routes
app.use("/api/auth", authRoutes);

// Transaction routes with stricter limiter
app.use("/api/transactions", transactionRoutes);

// Other routes
app.use("/api/alerts", alertRoutes);
app.use("/api/admin", adminRoutes);

// --------------------------------------------------------
// Health check
// --------------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "BankGuard backend is running",
  });
});

// --------------------------------------------------------
// 404 handler
// --------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// --------------------------------------------------------
// Error middleware (must be last)
// --------------------------------------------------------

app.use(errorMiddleware);

module.exports = app;
