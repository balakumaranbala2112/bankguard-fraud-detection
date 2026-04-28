// src/middleware/auditLogger.js
// FEATURE 9: Audit Log Middleware

const AuditLog = require("../models/AuditLog");
const logger = require("../utils/logger");

/**
 * Factory middleware — call auditLog("ACTION") to wrap a route.
 * Logs after the response is sent so it never delays the request.
 *
 * Usage:
 *   router.post("/login", auditLog("LOGIN"), authController.login);
 */
const auditLog = (action) => async (req, res, next) => {
  // Capture original json so we can inspect status after send
  const originalJson = res.json.bind(res);
  let responseStatus = 200;
  let responseSuccess = true;

  res.json = (body) => {
    responseStatus = res.statusCode;
    responseSuccess = body?.success !== false;
    return originalJson(body);
  };

  // After response finishes, write audit log (non-blocking)
  res.on("finish", () => {
    setImmediate(async () => {
      try {
        const userId = req.user?._id || req.body?.userId || null;

        // Build contextual details
        const details = {};
        if (action === "LOGIN" || action === "REGISTER") {
          details.phone = req.body?.phone;
        }
        if (action === "SEND_MONEY") {
          details.amount = req.body?.amount;
          details.receiver = req.body?.receiverAccountNumber;
        }
        if (action === "VERIFY_OTP") {
          details.transactionId = req.body?.transactionId;
        }
        if (action === "ADMIN_DECISION") {
          details.appealId = req.params?.id;
          details.decision = req.body?.status;
          details.adminNote = req.body?.adminNote;
        }
        if (action === "MODEL_RETRAIN") {
          details.triggeredBy = req.user?.email;
        }
        if (action === "APPEAL_SUBMIT") {
          details.transactionId = req.body?.transactionId;
        }

        await AuditLog.create({
          userId,
          action,
          details,
          ipAddress: req.ip || req.headers["x-forwarded-for"] || "unknown",
          userAgent: req.headers["user-agent"] || "unknown",
          success: responseSuccess,
        });
      } catch (err) {
        logger.warn(`[Audit] Failed to write log: ${err.message}`);
      }
    });
  });

  next();
};

module.exports = auditLog;
