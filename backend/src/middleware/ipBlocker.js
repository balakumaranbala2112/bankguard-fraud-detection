// src/middleware/ipBlocker.js — Feature 17
const BlacklistedIP = require("../models/BlacklistedIP");

module.exports = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const blocked = await BlacklistedIP.findOne({ ip });
    if (blocked) {
      return res.status(403).json({
        success: false,
        error: "Access denied — your IP has been blocked due to suspicious activity",
        blockedAt: blocked.createdAt,
      });
    }
    next();
  } catch (err) {
    // Never block request on middleware failure — fail open
    next();
  }
};
