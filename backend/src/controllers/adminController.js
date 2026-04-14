// src/controllers/adminController.js

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Alert = require("../models/Alert");
const logger = require("../utils/logger");

// --------------------------------------------------------
// Get all users — GET /api/admin/users
// --------------------------------------------------------
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

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
