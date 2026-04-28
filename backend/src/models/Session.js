// src/models/Session.js — Feature 20

const mongoose = require("mongoose");
const crypto = require("crypto");

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, index: true }, // SHA-256 of JWT
    deviceInfo: {
      userAgent: String,
      browser: String,
      os: String,
    },
    ipAddress: { type: String },
    lastActive: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// TTL: auto-expire sessions after 30 days of inactivity
sessionSchema.index({ lastActive: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

sessionSchema.statics.hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

module.exports = mongoose.model("Session", sessionSchema);  
