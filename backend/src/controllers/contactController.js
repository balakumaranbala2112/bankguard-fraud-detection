// src/controllers/contactController.js — Feature 22
const Contact = require("../models/Contact");
const User    = require("../models/User");
const logger  = require("../utils/logger");

// GET /api/contacts
exports.getContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find({ userId: req.user._id }).sort({ name: 1 });
    res.json({ success: true, contacts });
  } catch (err) { next(err); }
};

// POST /api/contacts
exports.createContact = async (req, res, next) => {
  try {
    const { name, accountNumber, nickname, avatar } = req.body;
    if (!name || !accountNumber) return res.status(400).json({ success: false, error: "Name and account number required" });

    // Verify account exists
    const target = await User.findOne({ accountNumber: accountNumber.trim() });
    if (!target) return res.status(404).json({ success: false, error: "Account not found in BankGuard" });
    if (target._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, error: "Cannot add yourself as a contact" });

    const contact = await Contact.create({
      userId: req.user._id,
      name: name.trim(),
      accountNumber: accountNumber.trim(),
      nickname: nickname?.trim() || "",
      avatar: avatar || "👤",
    });
    logger.info(`[Contacts] ${req.user.email} added ${accountNumber}`);
    res.status(201).json({ success: true, contact });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, error: "Contact already exists" });
    next(err);
  }
};

// DELETE /api/contacts/:id
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!contact) return res.status(404).json({ success: false, error: "Contact not found" });
    res.json({ success: true, message: "Contact removed" });
  } catch (err) { next(err); }
};
