// src/controllers/transactionController.js

const mlService = require("../services/mlService");
const twilioService = require("../services/twilioService");
const razorpayService = require("../services/razorpayService");
const Transaction = require("../models/Transaction");
const Alert = require("../models/Alert");
const User = require("../models/User");
const Payment = require("../models/Payment");
const logger = require("../utils/logger");

// --------------------------------------------------------
// Send Money — POST /api/transactions/send
// --------------------------------------------------------
exports.sendMoney = async (req, res, next) => {
  try {
    const {
      receiverAccountNumber,
      amount: rawAmount,
      note,
      location,
      isNewLocation,
      isNewBeneficiary,
      hour,
    } = req.body;

    const amount = Number(rawAmount);

    // Step 1 — Validate
    if (!receiverAccountNumber || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid receiver account and amount are required",
      });
    }

    // Step 2 — Sender
    const sender = await User.findById(req.user._id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        error: "Sender not found",
      });
    }

    // Step 3 — Receiver
    const receiver = await User.findOne({
      accountNumber: receiverAccountNumber,
    });
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: "Receiver account not found",
      });
    }

    // Step 4 — Self transfer check
    if (sender._id.toString() === receiver._id.toString()) {
      return res.status(400).json({
        success: false,
        error: "Cannot send money to yourself",
      });
    }

    // Step 5 — Duplicate prevention (10 second window)
    const existing = await Transaction.findOne({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      createdAt: { $gte: new Date(Date.now() - 10 * 1000) },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Duplicate transaction detected",
      });
    }

    // ── Step 6 — BUILD REAL FRAUD SIGNALS ──────────────
    // This is the core of pattern-based fraud detection

    // Get sender's last 50 approved transactions
    const history = await Transaction.find({
      sender: sender._id,
      status: "APPROVED",
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // ── Calculate average amount ──────────────────────
    // New user fallback: use usualAmountMax as baseline
    const avgAmount =
      history.length > 0
        ? history.reduce((sum, t) => sum + t.amount, 0) / history.length
        : sender.usualAmountMax || 2000;

    // ── Velocity check ────────────────────────────────
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentCount = await Transaction.countDocuments({
      sender: sender._id,
      createdAt: { $gte: twoMinsAgo },
    });

    // ── Beneficiary check ─────────────────────────────
    const isKnownBeneficiary =
      sender.knownBeneficiaries?.includes(receiver.accountNumber) || false;

    // ── NEW USER GRACE PERIOD ─────────────────────────
    // First 3 transactions get relaxed beneficiary rules
    // This prevents blocking every new user's first payment
    // All other fraud checks (amount, velocity, time) still apply
    const isNewUser = history.length < 3;

    // ── Hour check ────────────────────────────────────
    const currentHour = hour || new Date().getHours();
    const isOddHour =
      currentHour < (sender.usualHourStart || 9) ||
      currentHour > (sender.usualHourEnd || 22);

    // ── Amount checks ─────────────────────────────────
    const isUnusualAmount = avgAmount > 0 && amount > avgAmount * 5;
    const exceedsUsualMax = amount > (sender.usualAmountMax || 2000) * 3;

    logger.info(
      `Pattern check — avg: ${Math.round(avgAmount)} | ` +
        `amount: ${amount} | recentCount: ${recentCount} | ` +
        `knownBeneficiary: ${isKnownBeneficiary} | ` +
        `newUser: ${isNewUser} | oddHour: ${isOddHour}`,
    );

    // ── Build V features based on fraud signals ──────────
    // Negative values = fraud signals the model was trained on
    // New users get relaxed signals on beneficiary check only
    // All other signals (amount, velocity, time) apply to everyone

    // V14 — amount anomaly — WORKS FOR EVERYONE
    // Most important feature — catches large amount fraud
    const v14 = isUnusualAmount || exceedsUsualMax ? -7.2 : 0.1;

    // V17 — velocity signal — WORKS FOR EVERYONE
    // Catches rapid succession / bot attacks
    const v17 = recentCount > 3 ? -6.1 : 0.1;

    // V12 — new beneficiary signal
    // New users get relaxed signal (-2.0 instead of -5.1)
    // for their first 3 transactions (grace period)
    const v12 = !isKnownBeneficiary ? (isNewUser ? -2.0 : -5.1) : 0.1;

    // V10 — odd hour signal — WORKS FOR EVERYONE
    // Catches sleeping victim / overnight attacks
    const v10 = isOddHour ? -4.2 : 0.1;

    // V4 — new location signal — WORKS FOR EVERYONE
    const v4 = isNewLocation || false ? 3.2 : 0.5;

    // V3 — combined anomaly signal
    // Only triggers for established users with unusual + new beneficiary
    const v3 =
      isUnusualAmount && !isKnownBeneficiary && !isNewUser ? -4.5 : 0.1;

    // V11 — velocity pattern signal — WORKS FOR EVERYONE
    const v11 = recentCount > 5 ? 2.8 : 0.1;

    // V16 — location + beneficiary combined — WORKS FOR EVERYONE
    const v16 = (isNewLocation || false) && !isKnownBeneficiary ? -3.4 : 0.1;

    // Step 7 — Call ML model with real fraud signals
    const fraudResult = await mlService.predictFraud({
      amount,
      isNewLocation: isNewLocation || false,
      isNewBeneficiary: !isKnownBeneficiary,
      frequency: recentCount,
      hour: currentHour,
      timestamp: Date.now(),
      // Computed V features
      v3,
      v4,
      v10,
      v11,
      v12,
      v14,
      v16,
      v17,
    });

    let status = "PENDING";
    let razorpayOrder = null;

    // Step 8 — Take action based on risk level
    if (fraudResult.risk_level === "HIGH") {
      status = "BLOCKED";
      await twilioService.sendFraudAlert(
        sender.phone,
        amount,
        fraudResult.attack_type,
      );
      logger.warn(`🔴 BLOCKED — ${fraudResult.attack_type} | Rs ${amount}`);
    } else if (fraudResult.risk_level === "MEDIUM") {
      status = "OTP_PENDING";
      logger.warn(`🟡 OTP_PENDING — Rs ${amount}`);
    } else {
      // LOW RISK — check balance first
      if (sender.balance < amount) {
        razorpayOrder = await razorpayService.createOrder(amount);
        return res.json({
          success: true,
          status: "TOPUP_REQUIRED",
          message: "Insufficient balance — please top up",
          razorpayOrder,
        });
      }

      status = "APPROVED";
      logger.info(`🟢 APPROVED — Rs ${amount}`);
    }

    // Step 9 — Save transaction to MongoDB
    const transaction = await Transaction.create({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      status,
      riskLevel: fraudResult.risk_level,
      flag: fraudResult.flag,
      attackType: fraudResult.attack_type,
      confidence: fraudResult.confidence,
      location: location || "Unknown",
      isNewLocation: isNewLocation || false,
      isNewBeneficiary: !isKnownBeneficiary,
      transactionHour: currentHour,
      note: note || "",
    });

    // Step 10 — OTP flow
    // Send OTP AFTER transaction saved — we need the transactionId
    if (status === "OTP_PENDING") {
      await Transaction.findByIdAndUpdate(transaction._id, {
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        otpAttempts: 0,
      });
      await twilioService.sendOTP(sender._id, sender.phone, transaction._id);
    }

    // Step 11 — Transfer balance immediately for APPROVED
    if (status === "APPROVED") {
      // Re-fetch to get latest balance
      const freshSender = await User.findById(sender._id);
      if (freshSender.balance < amount) {
        await Transaction.findByIdAndUpdate(transaction._id, {
          status: "FAILED",
        });
        return res.status(400).json({
          success: false,
          error: "Insufficient balance",
        });
      }

      await User.findByIdAndUpdate(sender._id, {
        $inc: { balance: -amount },
      });
      await User.findByIdAndUpdate(receiver._id, {
        $inc: { balance: amount },
      });

      // Add receiver to sender's known beneficiaries
      await User.findByIdAndUpdate(sender._id, {
        $addToSet: { knownBeneficiaries: receiver.accountNumber },
      });

      await Transaction.findByIdAndUpdate(transaction._id, {
        status: "APPROVED",
      });
    }

    // Step 12 — Save alert if fraud detected
    if (fraudResult.is_fraud) {
      await Alert.create({
        userId: sender._id,
        transactionId: transaction._id,
        alertType:
          fraudResult.risk_level === "HIGH" ? "FRAUD_BLOCKED" : "OTP_TRIGGERED",
        attackType: fraudResult.attack_type,
        riskLevel: fraudResult.risk_level,
        flag: fraudResult.flag,
        amount,
        message: fraudResult.message,
        smsSent: true,
      });
    }

    // Step 13 — Return full result to React
    res.json({
      success: true,
      status,
      transaction,
      razorpayOrder,
      fraud_result: {
        is_fraud: fraudResult.is_fraud,
        risk_level: fraudResult.risk_level,
        flag: fraudResult.flag,
        action: fraudResult.action,
        attack_type: fraudResult.attack_type,
        confidence: fraudResult.confidence,
        probability: fraudResult.probability,
        message: fraudResult.message,
      },
    });
  } catch (error) {
    logger.error(`Send money error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Verify OTP — POST /api/transactions/verify-otp
// --------------------------------------------------------
exports.verifyOTP = async (req, res, next) => {
  try {
    const { transactionId, otp } = req.body;

    // Step 1 — Validate
    if (!transactionId || !otp) {
      return res.status(400).json({
        success: false,
        error: "Transaction ID and OTP are required",
      });
    }

    // Step 2 — Find transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    // Step 3 — Check correct status
    if (transaction.status !== "OTP_PENDING") {
      return res.status(400).json({
        success: false,
        error: "Transaction is not awaiting OTP verification",
      });
    }

    // Step 4 — Check OTP expiry
    if (transaction.otpExpiresAt && transaction.otpExpiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        error: "OTP expired — request a new one",
      });
    }

    // Step 5 — Check OTP attempts
    if (transaction.otpAttempts >= 5) {
      return res.status(400).json({
        success: false,
        error: "Too many OTP attempts — transaction blocked",
      });
    }

    // Step 6 — Verify OTP via twilioService
    const result = await twilioService.verifyOTP(
      req.user._id,
      req.user.phone,
      otp,
      transactionId,
    );

    if (!result.success) {
      await Transaction.findByIdAndUpdate(transactionId, {
        $inc: { otpAttempts: 1 },
      });
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Step 7 — Re-check balance before deducting
    // FIX: removed MongoDB sessions — needs replica set
    // Using direct updates instead — safe for single node MongoDB
    const freshSender = await User.findById(transaction.sender);
    if (!freshSender || freshSender.balance < transaction.amount) {
      return res.status(400).json({
        success: false,
        error: "Insufficient balance — please try again",
      });
    }

    // Step 8 — Transfer balance
    await User.findByIdAndUpdate(transaction.sender, {
      $inc: { balance: -transaction.amount },
    });
    await User.findByIdAndUpdate(transaction.receiver, {
      $inc: { balance: transaction.amount },
    });

    // Step 9 — Add receiver to known beneficiaries
    await User.findByIdAndUpdate(transaction.sender, {
      $addToSet: { knownBeneficiaries: transaction.receiver.toString() },
    });

    // Step 10 — Update transaction status
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { status: "APPROVED", otpVerified: true },
      { new: true },
    );

    // Step 11 — Create Razorpay order
    // const razorpayOrder = await razorpayService.createOrder(transaction.amount);

    logger.info("OTP verified — transaction approved");

    res.json({
      success: true,
      message: "OTP verified — transaction approved",
      requiresPayment: false,
      razorpayOrder,
      transaction: updatedTransaction,
    });
  } catch (error) {
    logger.error(`OTP verify error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get History — GET /api/transactions/history
// --------------------------------------------------------
exports.getHistory = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const { status, type, startDate, endDate } = req.query;

    const baseQuery = {
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    };

    if (status) baseQuery.status = status;

    if (startDate || endDate) {
      baseQuery.createdAt = {};
      if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) baseQuery.createdAt.$lte = new Date(endDate);
    }

    if (type === "sent") {
      baseQuery.sender = req.user._id;
      delete baseQuery.$or;
    } else if (type === "received") {
      baseQuery.receiver = req.user._id;
      delete baseQuery.$or;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(baseQuery)
        .populate("sender", "name accountNumber")
        .populate("receiver", "name accountNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(baseQuery),
    ]);

    res.json({
      success: true,
      count: transactions.length,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Get history error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get Alerts — GET /api/transactions/alerts
// --------------------------------------------------------
exports.getAlerts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const { type, isRead } = req.query;

    const query = { userId: req.user._id };
    if (type) query.alertType = type;
    if (isRead !== undefined) query.isRead = isRead === "true";

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .populate("transactionId", "amount status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: alerts.length,
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Get alerts error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Verify Razorpay Payment — POST /api/transactions/verify-payment
// --------------------------------------------------------
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature, amount } = req.body;

    if (!orderId || !paymentId || !signature || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing payment details",
      });
    }

    // Verify Razorpay signature
    const result = razorpayService.verifyPayment(orderId, paymentId, signature);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: "Payment verification failed",
      });
    }

    // Prevent duplicate payment
    const existingPayment = await Payment.findOne({ paymentId });
    if (existingPayment) {
      return res.status(400).json({
        success: false,
        error: "Payment already processed",
      });
    }

    // FIX: removed MongoDB sessions — use direct updates
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { balance: Number(amount) },
    });

    await Payment.create({
      userId: req.user._id,
      orderId,
      paymentId,
      amount: Number(amount),
      status: "SUCCESS",
    });

    logger.info(`Payment verified & wallet credited: ${paymentId}`);

    res.json({
      success: true,
      message: "Wallet topped up successfully",
      amount,
    });
  } catch (error) {
    logger.error(`Payment verify error: ${error.message}`);
    next(error);
  }
};
