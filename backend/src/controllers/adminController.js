// src/controllers/adminController.js

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Alert = require("../models/Alert");
const BlacklistedIP = require("../models/BlacklistedIP");
const logger = require("../utils/logger");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// --------------------------------------------------------
// Get all users — GET /api/admin/users
// --------------------------------------------------------
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-pin").sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    logger.error(`Get users error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get all transactions — GET /api/admin/transactions
// --------------------------------------------------------
exports.getAllTransactions = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find()
        .populate("sender", "name accountNumber email")
        .populate("receiver", "name accountNumber email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(),
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
    logger.error(`Get transactions error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get dashboard stats — GET /api/admin/stats
// --------------------------------------------------------
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalTransactions,
      blockedCount,
      flaggedCount,
      approvedCount,
      totalAlerts,
      unreadAlerts,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: "BLOCKED" }),
      Transaction.countDocuments({
        status: { $in: ["FLAGGED", "OTP_PENDING"] },
      }),
      Transaction.countDocuments({ status: "APPROVED" }),
      Alert.countDocuments(),
      Alert.countDocuments({ isRead: false }),
    ]);

    // Calculate total money blocked
    const blockedTransactions = await Transaction.find({
      status: "BLOCKED",
    }).select("amount");
    const totalBlocked = blockedTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    // Calculate total volume (approved transactions)
    const volumeResult = await Transaction.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalVolume = volumeResult.length > 0 ? volumeResult[0].total : 0;

    // Attack type breakdown
    const attackBreakdown = await Transaction.aggregate([
      { $match: { attackType: { $ne: "NONE" } } },
      { $group: { _id: "$attackType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const mediumCount = await Transaction.countDocuments({
      status: "OTP_PENDING",
    });

    res.json({
      success: true,
      totalUsers,
      totalTransactions,
      blockedCount,
      mediumCount,
      flaggedCount,
      approvedCount,
      totalAlerts,
      unreadAlerts,
      totalBlocked,
      totalVolume,
      attackBreakdown,
    });
  } catch (error) {
    logger.error(`Get stats error: ${error.message}`);
    next(error);
  }
};

// ── FEATURE 4: Retrain ML model — POST /api/admin/retrain ─────────────────
// ── FEATURE 12: Fraud Heatmap — GET /api/admin/heatmap ───────────────────
exports.getHeatmap = async (req, res, next) => {
  try {
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // 7×24 matrix indexed [dayOfWeek][hour]
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    const fraudMatrix = Array.from({ length: 7 }, () => Array(24).fill(0));

    const agg = await Transaction.aggregate([
      {
        $group: {
          _id: { day: { $dayOfWeek: "$createdAt" }, hour: "$transactionHour" },
          count: { $sum: 1 },
          fraud: { $sum: { $cond: [{ $eq: ["$riskLevel", "HIGH"] }, 1, 0] } },
        },
      },
    ]);

    agg.forEach(({ _id, count, fraud }) => {
      const day = (_id.day - 1) % 7; // $dayOfWeek 1=Sun → index 0
      const hour = Math.min(Math.max(_id.hour ?? 0, 0), 23);
      matrix[day][hour] = count;
      fraudMatrix[day][hour] = fraud;
    });

    res.json({ success: true, days: DAY_NAMES, matrix, fraudMatrix });
  } catch (err) { next(err); }
};

// ── FEATURE 15: Attack Trends — GET /api/admin/trends ─────────────────────
exports.getTrends = async (req, res, next) => {
  try {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const agg = await Transaction.aggregate([
      { $match: { riskLevel: { $in: ["HIGH"] }, createdAt: { $gte: eightWeeksAgo }, attackType: { $ne: null } } },
      {
        $group: {
          _id: { week: { $isoWeek: "$createdAt" }, year: { $isoWeekYear: "$createdAt" }, attack: "$attackType" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    // Pivot to { week: "W12", LARGE_AMOUNT_FRAUD: 3, ACCOUNT_TAKEOVER: 1, ... }
    const weekMap = {};
    agg.forEach(({ _id, count }) => {
      const key = `W${_id.week}`;
      if (!weekMap[key]) weekMap[key] = { week: key };
      weekMap[key][_id.attack] = (weekMap[key][_id.attack] || 0) + count;
    });

    res.json({ success: true, trends: Object.values(weekMap) });
  } catch (err) { next(err); }
};

// ── FEATURE 17: Blacklisted IPs ────────────────────────────────────────────
exports.getBlacklistedIPs = async (req, res, next) => {
  try {
    const ips = await BlacklistedIP.find().sort({ createdAt: -1 });
    res.json({ success: true, ips });
  } catch (err) { next(err); }
};

exports.removeBlacklistedIP = async (req, res, next) => {
  try {
    await BlacklistedIP.findByIdAndDelete(req.params.id);
    logger.info(`[Blacklist] Admin ${req.user.email} removed IP blacklist entry ${req.params.id}`);
    res.json({ success: true, message: "IP removed from blacklist" });
  } catch (err) { next(err); }
};

// ── FEATURE 25: Set User Limits — PUT /api/admin/users/:id/limits ─────────
exports.setUserLimits = async (req, res, next) => {
  try {
    const { dailyLimit, weeklyLimit } = req.body;
    const update = {};
    if (dailyLimit !== undefined) update.dailyLimit = Number(dailyLimit);
    if (weeklyLimit !== undefined) update.weeklyLimit = Number(weeklyLimit);
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    logger.info(`[Limits] Admin ${req.user.email} set limits for ${user.email}: daily=${dailyLimit} weekly=${weeklyLimit}`);
    res.json({ success: true, user: { dailyLimit: user.dailyLimit, weeklyLimit: user.weeklyLimit } });
  } catch (err) { next(err); }
};

exports.retrainModel = async (req, res, next) => {
  try {
    const mlModelDir = path.resolve(__dirname, "../../../ml-model");
    const retrainScript = path.join(mlModelDir, "retrain.py");

    if (!fs.existsSync(retrainScript)) {
      return res.status(404).json({
        success: false,
        error: "retrain.py not found in ml-model directory",
      });
    }

    logger.info(`[Retrain] Admin ${req.user.email} triggered model retraining`);

    const startTime = Date.now();
    const output = [];
    const errors = [];

    const pythonExec = process.platform === "win32" ? "python" : "python3";
    const proc = spawn(pythonExec, [retrainScript], {
      cwd: mlModelDir,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });

    proc.stdout.on("data", (data) => {
      const chunk = data.toString().trim();
      if (chunk) output.push(chunk);
    });

    proc.stderr.on("data", (data) => {
      const chunk = data.toString().trim();
      if (chunk) errors.push(chunk);
    });

    proc.on("close", (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (code !== 0) {
        logger.error(`[Retrain] Process exited with code ${code}`);
        return res.status(500).json({
          success: false,
          error: "Model retraining failed",
          output: output.join("\n"),
          errors: errors.join("\n"),
        });
      }

      // Parse metrics JSON from last line if retrain.py prints it
      let metrics = {};
      try {
        const lastLine = output[output.length - 1];
        if (lastLine?.startsWith("{")) metrics = JSON.parse(lastLine);
      } catch (_) { }

      logger.info(`[Retrain] Completed in ${elapsed}s`);

      res.json({
        success: true,
        message: `Model retrained successfully in ${elapsed}s`,
        metrics,
        output: output.join("\n"),
        elapsed: parseFloat(elapsed),
      });
    });

    proc.on("error", (err) => {
      logger.error(`[Retrain] spawn error: ${err.message}`);
      res.status(500).json({
        success: false,
        error: `Failed to start Python: ${err.message}`,
      });
    });

  } catch (error) {
    logger.error(`[Retrain] Error: ${error.message}`);
    next(error);
  }
};

// ── FEATURE: Attack Simulation ──────────────────────────────────────────────
exports.simulateAttack = async (req, res, next) => {
  try {
    const { userId, type, amount } = req.body;

    // Check Twilio service dynamically (will use default mock if not injected properly, but we import twilioService normally here to ensure dependencies)
    const TwilioService = require("../services/twilioService");
    const Alert = require("../models/Alert");
    const Transaction = require("../models/Transaction");
    const User = require("../models/User");

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    // Format Attack Scenarios
    let message = "Transaction blocked — simulated attack";
    const riskLevel = "HIGH";
    const flag = "RED";
    if (type === "ACCOUNT_TAKEOVER") {
      message = "Transaction blocked — login from new location to an unknown recipient";
    } else if (type === "RAPID_SUCCESSION_FRAUD") {
      message = "Transaction blocked — rapid velocity of transactions detected";
    } else if (type === "LARGE_AMOUNT_FRAUD") {
      message = "Transaction blocked — amount far exceeds known behavioral patterns";
    }

    // 1. Generate Mock Transaction
    const dummyTxn = await Transaction.create({
      sender: user._id,
      receiver: "65c3b1234567890123456789", // Dummy Admin ID 
      amount: amount || 50000,
      status: "BLOCKED",
      riskLevel,
      flag,
      attackType: type,
      confidence: 99.8,
      location: "SIMULATED_LOCATION",
      isNewLocation: true,
      isNewBeneficiary: true,
      transactionHour: new Date().getHours(),
      note: "SIMULATED ATTACK",
    });

    // 2. Generate Corresponding Target Alert
    await Alert.create({
      userId: user._id,
      transactionId: dummyTxn._id,
      alertType: "FRAUD_BLOCKED",
      attackType: type,
      riskLevel,
      flag,
      amount: dummyTxn.amount,
      message,
      smsSent: true,
    });

    // 3. Dispatch Twilio Warning SMS
    await TwilioService.sendFraudAlert(user.phone, dummyTxn.amount, type, riskLevel);

    // 4. Emit to Live Feed via Socket
    const socketIO = require("../utils/socketInstance");
    const socketPayload = {
      _id: dummyTxn._id,
      amount: dummyTxn.amount,
      status: "BLOCKED",
      riskLevel,
      flag,
      attackType: type,
      sender: { name: user.name, accountNumber: user.accountNumber },
      receiver: { name: "SIM_TARGET", accountNumber: "SIM_ACCT" },
      createdAt: dummyTxn.createdAt,
      message
    };

    socketIO.emitToAdmin("new_transaction", socketPayload);
    socketIO.emitToAdmin("fraud_alert", socketPayload);

    logger.info(`[Simulation] Simulated ${type} attack successfully on ${user.email}`);

    res.json({
      success: true,
      message: "Simulated attack triggered successfully and SMS dispatched",
      transaction: dummyTxn
    });
  } catch (error) {
    logger.error(`[Simulation] Error: ${error.message}`);
    next(error);
  }
};
