// src/models/OTP.js

const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    // Which user this OTP belongs to
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Phone number OTP was sent to
    phone: {
      type: String,
      required: true,
    },

    // The OTP code
    otp: {
      type: String,
      required: true,
    },

    // Which transaction this OTP is for
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },

    // OTP status
    isUsed: {
      type: Boolean,
      default: false,
    },

    isExpired: {
      type: Boolean,
      default: false,
    },

    // OTP expires after 5 minutes
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000),
    },
  },
  { timestamps: true },
);

// --------------------------------------------------------
// Auto expire OTP after 5 minutes using MongoDB TTL index
// --------------------------------------------------------
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// --------------------------------------------------------
// Method to check if OTP is valid
// --------------------------------------------------------
otpSchema.methods.isValid = function (enteredOTP) {
  // Check if already used
  if (this.isUsed) {
    return {
      valid: false,
      reason: "OTP already used",
    };
  }

  // Check if expired
  if (Date.now() > this.expiresAt) {
    return {
      valid: false,
      reason: "OTP expired — request a new one",
    };
  }

  // Check if matches
  if (this.otp !== enteredOTP) {
    return {
      valid: false,
      reason: "Invalid OTP — try again",
    };
  }

  return {
    valid: true,
    reason: "OTP verified successfully",
  };
};

module.exports = mongoose.model("OTP", otpSchema);
