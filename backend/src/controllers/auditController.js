// src/controllers/auditController.js
// FEATURE 9: Audit Log — Admin view

const AuditLog = require("../models/AuditLog");
const logger   = require("../utils/logger");

// ── GET /api/admin/audit-logs ──────────────────────────────────────────────
exports.getAuditLogs = async (req, res, next) => {
  try {
    const page   = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit  = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100);
    const skip   = (page - 1) * limit;
    const action = req.query.action || null; // optional action filter
    const userId = req.query.userId || null; // optional user filter

    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email accountNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count:   logs.length,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`[Audit] Get logs error: ${error.message}`);
    next(error);
  }
};
