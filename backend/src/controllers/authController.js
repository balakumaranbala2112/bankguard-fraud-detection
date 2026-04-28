const User          = require("../models/User");
const OTP           = require("../models/OTP");
const Session       = require("../models/Session");
const generateToken = require("../utils/generateToken");
const generateOTP   = require("../utils/generateOTP");
const logger        = require("../utils/logger");
const crypto        = require("crypto");
const bcrypt        = require("bcryptjs");

// Lazy-load services to avoid startup errors if not configured
const getEmailService = () => {
  try { return require("../services/emailService"); }
  catch (_) { return null; }
};
const getTwilio = () => {
  try { return require("../services/twilioService"); }
  catch (_) { return null; }
};

// Helper — hash user-agent into a consistent fingerprint
function deviceFingerprint(userAgent = "") {
  return crypto.createHash("sha256").update(userAgent || "unknown").digest("hex").slice(0, 32);
}

// ── Register — POST /api/auth/register ────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    let { name, pin, phone, email } = req.body;

    // ── Validate all fields ─────────────────────────────────────────
    if (!name || !pin || !phone || !email) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // Login PIN must be exactly 4 digits
    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ success: false, error: "Login PIN must be exactly 4 digits (0–9)" });
    }

    // Phone must be E.164 format (+91XXXXXXXXXX etc.)
    if (!/^\+[1-9]\d{9,14}$/.test(phone)) {
      return res.status(400).json({ success: false, error: "Invalid phone format — use +91XXXXXXXXXX" });
    }

    // Email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ success: false, error: "Invalid email format" });
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({ success: false, error: "Phone number already registered" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const user = await User.create({ name, pin, phone, email });
    const token = generateToken(user._id);

    logger.info(`New user registered: ${user.phone}`);

    // FEATURE 6: Send welcome email (non-blocking)
    setImmediate(async () => {
      const es = getEmailService();
      if (es) await es.sendWelcomeEmail(user).catch(() => {});
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id:            user._id,
        name:          user.name,
        phone:         user.phone,
        accountNumber: user.accountNumber,
        balance:       user.balance,
        role:          user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, error: `${field} already registered` });
    }
    logger.error(`Register error: ${error.message}`);
    next(error);
  }
};

// ── Login — POST /api/auth/login ──────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    let { phone, pin } = req.body;
    if (!phone || !pin) {
      return res.status(400).json({ success: false, error: "Phone and PIN are required" });
    }

    const user = await User.findOne({ phone }).select("+pin +knownDevices");

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid phone or PIN" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: "Account disabled — contact support" });
    }

    // FEATURE 18: Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      let timeLeft = `${mins} minute(s)`;
      if (mins > 60) timeLeft = `${Math.ceil(mins / 60)} hour(s)`;
      
      return res.status(403).json({
        success: false,
        error: `Account locked due to too many failed attempts. Try again in ${timeLeft}.`,
        lockedUntil: user.lockUntil,
      });
    }

    const isMatch = await user.comparePin(pin);
    if (!isMatch) {
      // FEATURE 18: Increment failed attempts
      const attempts = (user.loginAttempts || 0) + 1;
      const update   = { loginAttempts: attempts };
      if (attempts >= 3) {
        update.lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        setImmediate(async () => {
          const twilio = getTwilio();
          if (twilio) await twilio.sendSMS(user.phone, `BankGuard: Your account has been locked for 24 hours due to ${attempts} failed login attempts.`).catch(() => {});
        });
        await User.findByIdAndUpdate(user._id, update);
        return res.status(403).json({ success: false, error: "Account locked due to 3 failed attempts. Try again in 24 hours." });
      }
      await User.findByIdAndUpdate(user._id, update);
      return res.status(401).json({ success: false, error: `Invalid PIN. ${3 - attempts} attempt(s) remaining.` });
    }

    // FEATURE 18: Reset lockout on success
    if (user.loginAttempts > 0 || user.lockUntil) {
      await User.findByIdAndUpdate(user._id, { loginAttempts: 0, lockUntil: null });
    }

    // FEATURE 10: 2FA — check device fingerprint
    const fingerprint   = deviceFingerprint(req.headers["user-agent"]);
    const isKnownDevice = user.knownDevices?.includes(fingerprint);

    // Fix 8: bypass only in non-production — remove hardcoded demo phone bypass
    const bypass2FA = process.env.NODE_ENV !== "production";

    if (!isKnownDevice && !bypass2FA) {
      logger.info(`Login 2FA required: ${user.phone} | device: ${fingerprint.slice(0, 8)}…`);
      return res.json({
        success: true,
        requires2FA: true,
        userId: user._id,
        message: "OTP required — new device detected",
      });
    }

    // Known device → issue JWT directly
    const token = generateToken(user._id);
    logger.info(`User login: ${user.phone} | IP: ${req.ip}`);

    // FEATURE 20: Create session record
    setImmediate(async () => {
      try {
        await Session.create({
          userId:    user._id,
          tokenHash: Session.hashToken(token),
          deviceInfo: { userAgent: req.headers["user-agent"] },
          ipAddress: req.ip,
        });
      } catch (_) {}
    });

    // FEATURE 6: Login email (non-blocking)
    setImmediate(async () => {
      const es = getEmailService();
      if (es) await es.sendLoginEmail(user, req.ip).catch(() => {});
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id:               user._id,
        name:             user.name,
        phone:            user.phone,
        accountNumber:    user.accountNumber,
        balance:          user.balance,
        role:             user.role,
        hasTransactionPin: user.hasTransactionPin,
        dailyLimit:       user.dailyLimit,
        weeklyLimit:      user.weeklyLimit,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

// ── FEATURE 10: Send Login OTP — POST /api/auth/send-login-otp ───────────
exports.sendLoginOtp = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const { otp, expiresAt } = generateOTP();

    // Invalidate old login OTPs for this user — Fix 15: use type field instead of $exists
    await OTP.updateMany({ userId: user._id, type: "LOGIN", isUsed: false }, { isUsed: true });

    await OTP.create({
      userId:        user._id,
      phone:         user.phone,
      otp,
      expiresAt,
      type:          "LOGIN", // Fix 15
    });

    // Fix 11: use lazy-loaded twilioService.sendSMS() instead of direct Twilio client import
    const twilio = getTwilio();
    if (twilio) {
      await twilio.sendSMS(
        user.phone,
        `BankGuard: Your login OTP is ${otp}. Valid for 5 minutes. Do not share this code.`,
      ).catch((err) => logger.warn(`[2FA] SMS failed: ${err.message}`));
    }

    logger.info(`[2FA] Login OTP sent to ${user.phone}`);

    res.json({ success: true, message: "OTP sent to your registered phone number" });
  } catch (error) {
    logger.error(`[2FA] sendLoginOtp error: ${error.message}`);
    next(error);
  }
};

// ── FEATURE 10: Verify Login OTP — POST /api/auth/verify-login-otp ────────
exports.verifyLoginOtp = async (req, res, next) => {
  try {
    const { userId, otp, userAgent } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ success: false, error: "userId and otp are required" });
    }

    const user = await User.findById(userId).select("+knownDevices");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Find the login OTP — Fix 15: query by type field instead of $exists
    const otpRecord = await OTP.findOne({
      userId:  user._id,
      type:    "LOGIN",
      isUsed:  false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: "OTP not found — request a new one" });
    }

    const validation = otpRecord.isValid(otp);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.reason });
    }

    // Mark OTP used
    await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });

    // Add device to known devices
    const fingerprint = deviceFingerprint(userAgent || req.headers["user-agent"]);
    if (!user.knownDevices.includes(fingerprint)) {
      user.knownDevices.push(fingerprint);
      if (user.knownDevices.length > 10) user.knownDevices.shift(); // cap at 10
      await user.save();
    }

    const token = generateToken(user._id);
    logger.info(`[2FA] Login OTP verified for ${user.phone}`);

    // FEATURE 6: Login email
    setImmediate(async () => {
      const es = getEmailService();
      if (es) await es.sendLoginEmail(user, req.ip).catch(() => {});
    });

    res.json({
      success: true,
      message: "OTP verified — login successful",
      token,
      user: {
        id:            user._id,
        name:          user.name,
        phone:         user.phone,
        accountNumber: user.accountNumber,
        balance:       user.balance,
        role:          user.role,
      },
    });
  } catch (error) {
    logger.error(`[2FA] verifyLoginOtp error: ${error.message}`);
    next(error);
  }
};

// ── FEATURE 7: Save push subscription — POST /api/auth/push-subscribe ─────
exports.savePushSubscription = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) {
      return res.status(400).json({ success: false, error: "Invalid subscription object" });
    }

    await User.findByIdAndUpdate(req.user._id, { pushSubscription: subscription });
    logger.info(`[Push] Subscription saved for user ${req.user._id}`);

    res.json({ success: true, message: "Push subscription saved" });
  } catch (error) {
    logger.error(`[Push] Save subscription error: ${error.message}`);
    next(error);
  }
};

// ── Get Profile — GET /api/auth/profile ───────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (!user.isActive) return res.status(403).json({ success: false, error: "Account is disabled" });

    res.json({
      success: true,
      user: {
        id:               user._id,
        name:             user.name,
        phone:            user.phone,
        accountNumber:    user.accountNumber,
        balance:          user.balance,
        role:             user.role,
        usualLocation:    user.usualLocation,
        createdAt:        user.createdAt,
        hasTransactionPin: user.hasTransactionPin,
        dailyLimit:       user.dailyLimit,
        weeklyLimit:      user.weeklyLimit,
      },
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    next(error);
  }
};

// ── FEATURE 19: Set Transaction PIN — POST /api/auth/set-pin ───────────────
exports.setTransactionPin = async (req, res, next) => {
  try {
    const { pin, currentPin } = req.body;
    // Transaction PIN is exactly 6 digits (different from 4-digit login PIN)
    if (!pin || !/^\d{6}$/.test(String(pin)))
      return res.status(400).json({ success: false, error: "Transaction PIN must be exactly 6 digits" });

    const user = await User.findById(req.user._id).select("+transactionPin");
    if (user.hasTransactionPin && currentPin) {
      const ok = await bcrypt.compare(String(currentPin), user.transactionPin);
      if (!ok) return res.status(401).json({ success: false, error: "Current PIN is incorrect" });
    }

    const hashed = await bcrypt.hash(String(pin), 10);
    await User.findByIdAndUpdate(req.user._id, { transactionPin: hashed, hasTransactionPin: true });
    logger.info(`[PIN] Set for ${req.user.phone}`);
    res.json({ success: true, message: "Transaction PIN set successfully" });
  } catch (err) { next(err); }
};

// ── FEATURE 20: Session Management ────────────────────────────────────────
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id, isActive: true })
      .sort({ lastActive: -1 }).limit(10);
    res.json({ success: true, sessions });
  } catch (err) { next(err); }
};

exports.deleteSession = async (req, res, next) => {
  try {
    await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false }
    );
    res.json({ success: true, message: "Session terminated" });
  } catch (err) { next(err); }
};
