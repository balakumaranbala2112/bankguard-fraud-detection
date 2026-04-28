// src/models/Contact.js — Feature 22

const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name:          { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    nickname:      { type: String, trim: true, default: "" },
    avatar:        { type: String, default: "👤" }, // emoji or initials
  },
  { timestamps: true }
);

// Each user can't have duplicate accountNumbers in their contacts
contactSchema.index({ userId: 1, accountNumber: 1 }, { unique: true });

module.exports = mongoose.model("Contact", contactSchema);
