// src/controllers/analyticsController.js — Feature 14
const Transaction = require("../models/Transaction");

// GET /api/analytics/spending
exports.getSpending = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Last 6 months monthly totals
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthly = await Transaction.aggregate([
      { $match: { sender: userId, status: "APPROVED", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          sent: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const received = await Transaction.aggregate([
      { $match: { receiver: userId, status: "APPROVED", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          received: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Hour of day distribution (sent)
    const byHour = await Transaction.aggregate([
      { $match: { sender: userId, status: "APPROVED" } },
      { $group: { _id: "$transactionHour", count: { $sum: 1 }, total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]);

    // Day of week (sent)
    const byDay = await Transaction.aggregate([
      { $match: { sender: userId, status: "APPROVED" } },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" }, // 1=Sun, 7=Sat
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Total stats
    const totals = await Transaction.aggregate([
      { $match: { sender: userId, status: "APPROVED" } },
      { $group: { _id: null, totalSent: { $sum: "$amount" }, count: { $sum: 1 }, avgAmount: { $avg: "$amount" } } },
    ]);

    res.json({
      success: true,
      monthly,
      received,
      byHour,
      byDay,
      totals: totals[0] || { totalSent: 0, count: 0, avgAmount: 0 },
    });
  } catch (err) { next(err); }
};
