// src/models/AuditLog.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "REGISTER",
        "SEND_MONEY",
        "VERIFY_OTP",
        "PROFILE_UPDATE",
        "ADMIN_DECISION",
        "ADMIN_USER_VIEW",
        "MODEL_RETRAIN",
        "APPEAL_SUBMIT",
        "LOGIN_OTP_SENT",
        "LOGIN_OTP_VERIFIED",
      ],
      index: true,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      trim: true,
    },

    userAgent: {
      type: String,
      trim: true,
    },

    success: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// TTL index: auto-delete logs older than 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
