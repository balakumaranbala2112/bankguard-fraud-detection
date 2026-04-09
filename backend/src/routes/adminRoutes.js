const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");

// ── Admin role guard ───────────────────────────────
const isAdmin = (req, res, next) => {
  // Debug log — see what role is attached
  logger.info
    ? logger.info(`Admin check — role: ${req.user?.role}`)
    : console.log(`Admin check — role: ${req.user?.role}`);

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied — admin only",
    });
  }
  next();
};

// ── Routes ─────────────────────────────────────────
router.get("/users", protect, isAdmin, adminController.getAllUsers);
router.get(
  "/transactions",
  protect,
  isAdmin,
  adminController.getAllTransactions,
);
router.get("/stats", protect, isAdmin, adminController.getStats);

module.exports = router;
