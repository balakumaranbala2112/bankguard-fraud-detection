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
      users: users,
    });
  } catch (error) {
    logger.error(`❌ Get users error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get all transactions — GET /api/admin/transactions
// --------------------------------------------------------
exports.getAllTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find()
      .populate("sender", "name accountNumber")
      .populate("receiver", "name accountNumber")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: transactions.length,
      transactions: transactions,
    });
  } catch (error) {
    logger.error(`❌ Get transactions error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get dashboard stats — GET /api/admin/stats
// --------------------------------------------------------
exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();
    const blockedCount = await Transaction.countDocuments({
      status: "BLOCKED",
    });
    const flaggedCount = await Transaction.countDocuments({
      status: "FLAGGED",
    });
    const approvedCount = await Transaction.countDocuments({
      status: "APPROVED",
    });
    const totalAlerts = await Alert.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTransactions,
        blockedCount,
        flaggedCount,
        approvedCount,
        totalAlerts,
      },
    });
  } catch (error) {
    logger.error(`❌ Get stats error: ${error.message}`);
    next(error);
  }
};
