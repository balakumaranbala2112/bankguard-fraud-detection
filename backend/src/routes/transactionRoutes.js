const express = require("express");
const router = express.Router();

const transactionController = require("../controllers/transactionController");
const { protect } = require("../middleware/authMiddleware");
const { transactionLimiter } = require("../middleware/rateLimiter");

router.post(
  "/send",
  protect,
  transactionLimiter,
  transactionController.sendMoney,
);
router.post(
  "/verify-otp",
  protect,
  transactionLimiter,
  transactionController.verifyOTP,
);
router.post(
  "/verify-payment",
  protect,
  transactionLimiter,
  transactionController.verifyPayment,
);
router.get("/history", protect, transactionController.getHistory);
router.get("/alerts", protect, transactionController.getAlerts);
router.get("/recent-recipients", protect, transactionController.getRecentRecipients);

module.exports = router;
