const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

// Public routes
router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);

// Protected routes
router.get("/profile", protect, authController.getProfile);

module.exports = router;
