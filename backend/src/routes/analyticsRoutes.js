// src/routes/analyticsRoutes.js — Feature 14
const express              = require("express");
const router               = express.Router();
const analyticsController  = require("../controllers/analyticsController");
const { protect }          = require("../middleware/authMiddleware");

router.get("/spending", protect, analyticsController.getSpending);

module.exports = router;
