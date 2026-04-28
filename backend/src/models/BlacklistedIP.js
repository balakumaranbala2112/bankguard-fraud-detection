// src/models/BlacklistedIP.js — Feature 17

const mongoose = require("mongoose");

const blacklistedIPSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, unique: true, index: true },
    reason: { type: String, default: "Auto-blocked after 3 blocked transactions" },
    transactionCount: { type: Number, default: 0 },
    blockedBy: { type: String, default: "system" }, // "system" | admin email
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlacklistedIP", blacklistedIPSchema);
