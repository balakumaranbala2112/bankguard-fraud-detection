// src/controllers/qrController.js — Feature 21
const QRCode = require("qrcode");
const User = require("../models/User");
const logger = require("../utils/logger");

// GET /api/transactions/qr/:accountNumber
exports.getQRCode = async (req, res, next) => {
  try {
    const { accountNumber } = req.params;
    const user = await User.findOne({ accountNumber });
    if (!user) return res.status(404).json({ success: false, error: "Account not found" });

    const payload = JSON.stringify({ accountNumber: user.accountNumber, name: user.name });
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 300,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    logger.info(`[QR] Generated QR for ${accountNumber}`);
    res.json({ success: true, qrCode: dataUrl, name: user.name, accountNumber: user.accountNumber });
  } catch (err) { next(err); }
};
