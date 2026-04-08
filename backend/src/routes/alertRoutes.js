// src/routes/alertRoutes.js

const express = require("express");
const router = express.Router();
const Alert = require("../models/Alert");
const { protect } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// --------------------------------------------------------
// Get all alerts — GET /api/alerts
// --------------------------------------------------------
router.get("/", protect, async (req, res, next) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id })
      .populate("transactionId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: alerts.length,
      alerts: alerts,
    });
  } catch (error) {
    logger.error(`Get alerts error: ${error.message}`);
    next(error);
  }
});

// --------------------------------------------------------
// Get unread alert count — GET /api/alerts/unread-count
// FIX: moved ABOVE /:id/read so Express matches this
// static path before treating 'unread-count' as an :id param
// --------------------------------------------------------
router.get("/unread-count", protect, async (req, res, next) => {
  try {
    const count = await Alert.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.json({
      success: true,
      count: count,
    });
  } catch (error) {
    logger.error(`❌ Unread count error: ${error.message}`);
    next(error);
  }
});

// --------------------------------------------------------
// Mark alert as read — PUT /api/alerts/:id/read
// Dynamic param route — always declared last
// --------------------------------------------------------
router.put("/:id/read", protect, async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);

    // Guard: make sure the alert belongs to the logged-in user
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: "Alert not found",
      });
    }

    if (alert.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorised to update this alert",
      });
    }

    await Alert.findByIdAndUpdate(req.params.id, { isRead: true });

    res.json({
      success: true,
      message: "Alert marked as read",
    });
  } catch (error) {
    logger.error(`❌ Mark alert read error: ${error.message}`);
    next(error);
  }
});

module.exports = router;
