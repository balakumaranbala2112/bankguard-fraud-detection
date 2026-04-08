const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

// --------------------------------------------------------
// General API rate limiter
// --------------------------------------------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 mins
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts per 15 mins
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
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 transactions per minute
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
