// src/controllers/appealController.js
// FEATURE 5: Fraud Appeal System

const Appeal      = require("../models/Appeal");
const Transaction = require("../models/Transaction");
const logger      = require("../utils/logger");

// ── POST /api/appeals — User submits appeal ────────────────────────────────
exports.submitAppeal = async (req, res, next) => {
  try {
    const { transactionId, reason } = req.body;
    const userId = req.user._id;

    if (!transactionId || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        error: "transactionId and reason are required",
      });
    }

    // Verify the transaction belongs to this user and is BLOCKED
    const txn = await Transaction.findOne({
      _id: transactionId,
      sender: userId,
      status: "BLOCKED",
    });

    if (!txn) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found or is not eligible for appeal",
      });
    }

    // Prevent duplicate appeal
    const existing = await Appeal.findOne({ userId, transactionId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "An appeal already exists for this transaction",
        appeal: existing,
      });
    }

    const appeal = await Appeal.create({ userId, transactionId, reason });

    logger.info(`[Appeal] User ${userId} appealed transaction ${transactionId}`);

    res.status(201).json({
      success: true,
      message: "Appeal submitted successfully",
      appeal,
    });
  } catch (error) {
    logger.error(`[Appeal] Submit error: ${error.message}`);
    next(error);
  }
};

// ── GET /api/appeals — User views their own appeals ────────────────────────
exports.getUserAppeals = async (req, res, next) => {
  try {
    const appeals = await Appeal.find({ userId: req.user._id })
      .populate("transactionId", "amount status attackType createdAt riskLevel")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: appeals.length, appeals });
  } catch (error) {
    logger.error(`[Appeal] Get user appeals error: ${error.message}`);
    next(error);
  }
};

// ── GET /api/admin/appeals — Admin views all appeals ──────────────────────
exports.getAllAppeals = async (req, res, next) => {
  try {
    const status = req.query.status; // optional filter: PENDING | APPROVED | REJECTED
    const filter = status ? { status } : {};

    const appeals = await Appeal.find(filter)
      .populate("userId",        "name email accountNumber")
      .populate("transactionId", "amount status attackType createdAt riskLevel")
      .populate("decidedBy",     "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: appeals.length, appeals });
  } catch (error) {
    logger.error(`[Appeal] Get all appeals error: ${error.message}`);
    next(error);
  }
};

// ── PUT /api/admin/appeals/:id — Admin decides on appeal ──────────────────
exports.adminDecideAppeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "status must be APPROVED or REJECTED",
      });
    }

    const appeal = await Appeal.findById(id);
    if (!appeal) {
      return res.status(404).json({ success: false, error: "Appeal not found" });
    }
    if (appeal.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: "Appeal has already been decided",
      });
    }

    appeal.status    = status;
    appeal.adminNote = adminNote || "";
    appeal.decidedAt = new Date();
    appeal.decidedBy = req.user._id;
    await appeal.save();

    // If approved — update transaction status to APPROVED
    if (status === "APPROVED") {
      await Transaction.findByIdAndUpdate(appeal.transactionId, {
        status: "APPROVED",
      });
      logger.info(`[Appeal] Admin approved appeal ${id} — transaction unblocked`);
    }

    logger.info(`[Appeal] Admin ${req.user.email} decision: ${status} on appeal ${id}`);

    res.json({
      success: true,
      message: `Appeal ${status.toLowerCase()} successfully`,
      appeal,
    });
  } catch (error) {
    logger.error(`[Appeal] Admin decide error: ${error.message}`);
    next(error);
  }
};
