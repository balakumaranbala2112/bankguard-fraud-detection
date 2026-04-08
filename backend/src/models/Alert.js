// src/models/Alert.js

const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    // Which user this alert belongs to
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Which transaction triggered this alert
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },

    // Alert details
    alertType: {
      type: String,
      enum: ["FRAUD_BLOCKED", "OTP_TRIGGERED", "SUSPICIOUS"],
      default: "SUSPICIOUS",
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

    // Risk level
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "HIGH",
    },

    flag: {
      type: String,
      enum: ["GREEN", "AMBER", "RED"],
      default: "RED",
    },

    // Transaction amount that triggered alert
    amount: {
      type: Number,
      required: true,
    },

    // Alert message
    message: {
      type: String,
      default: "",
    },

    // SMS notification status
    smsSent: {
      type: Boolean,
      default: false,
    },

    // Whether user has seen this alert
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Alert", alertSchema);
