const express = require("express");
const router  = express.Router();

const transactionController = require("../controllers/transactionController");
const receiptController     = require("../controllers/receiptController"); // F8
const qrController          = require("../controllers/qrController");      // F21
const { protect }           = require("../middleware/authMiddleware");
const { transactionLimiter } = require("../middleware/rateLimiter");
const auditLog              = require("../middleware/auditLogger");         // F9
const ipBlocker             = require("../middleware/ipBlocker");           // F17

router.post(
  "/",
  protect,
  ipBlocker,
  transactionLimiter,
  auditLog("SEND_MONEY"),
  transactionController.sendMoney,
);
router.post(
  "/verify-otp",
  protect,
  transactionLimiter,
  auditLog("VERIFY_OTP"),
  transactionController.verifyOTP,
);
router.post(
  "/:id/confirm",
  protect,
  transactionLimiter,
  auditLog("VERIFY_PIN"),
  transactionController.confirmTransaction,
);
router.post(
  "/:id/verify",
  protect,
  transactionLimiter,
  transactionController.verifyPayment,
);
router.get("/",           protect, transactionController.getHistory);
router.get("/alerts",            protect, transactionController.getAlerts);
router.get("/recipients", protect, transactionController.getRecentRecipients);

// FEATURE 8: PDF receipt download
router.get("/:id/receipt", protect, receiptController.downloadReceipt);

// FEATURE 21: QR code generation
router.get("/qr/:accountNumber", protect, qrController.getQRCode);

module.exports = router;
