const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    // Step 1 — Check header exists
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied — no token provided",
      });
    }

    // Step 2 — Extract token
    const parts = authHeader.split(" ");
    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        error: "Invalid authorization format",
      });
    }

    const token = parts[1];

    // Step 3 — Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Step 4 — Single DB fetch with ALL fields controllers need
    const user = await User.findById(decoded.id).select(
      "_id role isActive phone name email accountNumber balance " +
        "usualLocation usualAmountMin usualAmountMax " +
        "usualHourStart usualHourEnd knownBeneficiaries",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Access denied — user not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is disabled",
      });
    }

    // Step 5 — Attach full user to request
    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Session expired — please login again",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
};

module.exports = { protect };
