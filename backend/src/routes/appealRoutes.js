// src/routes/appealRoutes.js
// FEATURE 5: Fraud Appeal System

const express          = require("express");
const router           = express.Router();
const appealController = require("../controllers/appealController");
const { protect }      = require("../middleware/authMiddleware");
const auditLog         = require("../middleware/auditLogger");

// POST /api/appeals — user submits an appeal
router.post(
  "/",
  protect,
  auditLog("APPEAL_SUBMIT"),
  appealController.submitAppeal
);

// GET /api/appeals — user views their own appeals
router.get("/", protect, appealController.getUserAppeals);

module.exports = router;
