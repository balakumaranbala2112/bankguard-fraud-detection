// src/routes/adminRoutes.js

const express          = require("express");
const router           = express.Router();
const adminController  = require("../controllers/adminController");
const appealController = require("../controllers/appealController");   // F5
const auditController  = require("../controllers/auditController");    // F9
const reportController = require("../controllers/reportController");   // F13
const { protect }      = require("../middleware/authMiddleware");
const isAdmin          = require("../middleware/isAdmin");              // Fix 6
const auditLog         = require("../middleware/auditLogger");
const logger           = require("../utils/logger");

// Fix 6: Apply protect + isAdmin globally to ALL admin routes
router.use(protect, isAdmin);

router.get("/users",        adminController.getAllUsers);
router.get("/transactions", adminController.getAllTransactions);
router.get("/stats",        adminController.getStats);

// F4 — Model Retrain
router.post("/retrain", auditLog("MODEL_RETRAIN"), adminController.retrainModel);

// F5 — Appeals
router.get("/appeals",       appealController.getAllAppeals);
router.put("/appeals/:id",   auditLog("ADMIN_DECISION"), appealController.adminDecideAppeal);

// F9 — Audit logs
router.get("/audit-logs",    auditController.getAuditLogs);

// F12 — Heatmap
router.get("/heatmap",       adminController.getHeatmap);

// F15 — Trends
router.get("/trends",        adminController.getTrends);

// F17 — IP Blacklist
router.get("/blacklisted-ips",          adminController.getBlacklistedIPs);
router.delete("/blacklisted-ips/:id",   adminController.removeBlacklistedIP);

// F25 — User Limits
router.put("/users/:id/limits",         adminController.setUserLimits);

// F13 — Monthly Fraud Report
router.get("/reports/monthly",          reportController.downloadMonthlyReport);

// F??? — Simulated Attack Feature
router.post("/simulate-attack",         adminController.simulateAttack);

module.exports = router;
