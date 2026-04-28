// src/middleware/isAdmin.js
// Fix 6: Dedicated admin guard middleware
// Asserts req.user.role === "admin"; must be used AFTER the protect middleware.

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied — admin only",
    });
  }
  next();
};

module.exports = isAdmin;
