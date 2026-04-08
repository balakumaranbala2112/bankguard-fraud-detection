const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // Who is sending
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who is receiving
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Transaction amount
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // Transaction status
    status: {
      type: String,
      enum: [
        "APPROVED",
        "FLAGGED",
        "BLOCKED",
        "OTP_PENDING",
        "FAILED",
        "PENDING",
        "TOPUP_REQUIRED",
      ],
      default: "APPROVED",
    },

    // ML model results
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },

    flag: {
      type: String,
      enum: ["GREEN", "AMBER", "RED"],
      default: "GREEN",
    },

    attackType: {
      type: String,
      enum: [
        "NONE",
        "LARGE_AMOUNT_FRAUD",
        "ACCOUNT_TAKEOVER",
        "RAPID_SUCCESSION_FRAUD",
        "ODD_HOUR_FRAUD",
        "NEW_BENEFICIARY_FRAUD",
        "PATTERN_ANOMALY",
      ],
      default: "NONE",
    },

    // Fraud probability from ML model
    confidence: {
      type: Number,
      default: 0,
    },

    // Transaction context
    location: {
      type: String,
      default: "Unknown",
    },

    isNewLocation: {
      type: Boolean,
      default: false,
    },

    isNewBeneficiary: {
      type: Boolean,
      default: false,
    },

    transactionHour: {
      type: Number,
      default: 0,
    },

    // OTP verification
    otpVerified: {
      type: Boolean,
      default: false,
    },

    otpAttempts: {
      type: Number,
      default: 0,
    },

    otpExpiresAt: Date,

    // Note or description
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
