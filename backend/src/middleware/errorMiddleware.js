const logger = require("../utils/logger");

const errorMiddleware = (err, req, res, next) => {
  // Log the error
  logger.error(
    `${err.message} | Route: ${req.originalUrl} | Method: ${req.method}`,
  );

  // ── Mongoose validation error ──────────────────────
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: messages.join(", "),
    });
  }

  // ── Mongoose duplicate key error ───────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `${field} already exists`,
    });
  }

  // ── JWT errors ─────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      error: "Invalid token — please login again",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      error: "Session expired — please login again",
    });
  }

  // ── Mongoose cast error (invalid ObjectId) ─────────
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: "Invalid ID format",
    });
  }

  // ── Axios / ML service error ───────────────────────
  if (err.message && err.message.includes("ML service")) {
    return res.status(503).json({
      success: false,
      error: err.message,
    });
  }

  // ── Default server error ───────────────────────────
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
};

module.exports = errorMiddleware;
