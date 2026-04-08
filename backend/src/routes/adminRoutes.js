const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");

const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied — admin only",
    });
  }
  next();
};

// All admin routes require a valid token AND admin role
router.get("/users", protect, isAdmin, adminController.getAllUsers);
router.get(
  "/transactions",
  protect,
  isAdmin,
  adminController.getAllTransactions,
);
router.get("/stats", protect, isAdmin, adminController.getStats);

module.exports = router;
