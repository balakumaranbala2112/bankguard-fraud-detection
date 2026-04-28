const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const qrController = require("../controllers/qrController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const auditLog = require("../middleware/auditLogger");

// ── Public routes ──────────────────────────────────────────────────────────
router.post("/register", authLimiter, auditLog("REGISTER"), authController.register);
router.post("/login", authLimiter, auditLog("LOGIN"), authController.login);

// ── FEATURE 10: 2FA Login ─────────────────────────────────────────────────
router.post("/send-login-otp", authLimiter, auditLog("LOGIN_OTP_SENT"), authController.sendLoginOtp);
router.post("/verify-login-otp", authLimiter, auditLog("LOGIN_OTP_VERIFIED"), authController.verifyLoginOtp);

// ── FEATURE 7: Push notifications — save subscription ─────────────────────
router.post("/push-subscribe", protect, authController.savePushSubscription);

// ── FEATURE 19: Transaction PIN ────────────────────────────────────────────
router.put("/pin", protect, authController.setTransactionPin);

// ── FEATURE 20: Session management ────────────────────────────────────────
router.get("/sessions", protect, authController.getSessions);
router.delete("/sessions/:id", protect, authController.deleteSession);

// ── Protected routes ───────────────────────────────────────────────────────
router.get("/profile", protect, authController.getProfile);

module.exports = router;
