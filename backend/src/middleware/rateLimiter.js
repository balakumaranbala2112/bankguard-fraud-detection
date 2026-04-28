const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

// --------------------------------------------------------
// General API rate limiter
// --------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS,  10) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_API_MAX,         10) || 200,
  message: {
    success: false,
    error: "Too many requests — please try again after 15 minutes",
  },
  handler: (req, res, options) => {
    logger.warn(
      `⚠️ Rate limit exceeded: ${req.ip} | Route: ${req.originalUrl}`,
    );
    res.status(429).json(options.message);
  },
});

// --------------------------------------------------------
// Strict limiter for auth routes
// --------------------------------------------------------
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_AUTH_MAX,        10) || 20,
  message: {
    success: false,
    error: "Too many login attempts — please try again after 15 minutes",
  },
  handler: (req, res, options) => {
    logger.warn(
      `Auth rate limit exceeded: ${req.ip} | Route: ${req.originalUrl}`,
    );
    res.status(429).json(options.message);
  },
});

// --------------------------------------------------------
// Strict limiter for transaction routes
// --------------------------------------------------------
const transactionLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_TXN_WINDOW_MS,  10) || 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_TXN_MAX,         10) || 30,
  message: {
    success: false,
    error: "Too many transactions — please slow down",
  },
  handler: (req, res, options) => {
    logger.warn(`Transaction rate limit exceeded: ${req.ip}`);
    res.status(429).json(options.message);
  },
});

module.exports = { apiLimiter, authLimiter, transactionLimiter };
