// src/routes/mlRoutes.js
// FEATURE 1: SHAP Explainability proxy

const express      = require("express");
const router       = express.Router();
const mlController = require("../controllers/mlController");
const { protect }  = require("../middleware/authMiddleware");

// POST /api/ml/explain — proxied to Flask /explain
router.post("/explain", protect, mlController.explainTransaction);

module.exports = router;
