// src/controllers/mlController.js
// FEATURE 1: Proxy to Flask /explain endpoint

const axios  = require("axios");
const logger = require("../utils/logger");

const ML_API = process.env.ML_API_URL || "http://localhost:5000";

// ── POST /api/ml/explain ───────────────────────────────────────────────────
exports.explainTransaction = async (req, res, next) => {
  try {
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        success: false,
        error: "Request body with transaction features is required",
      });
    }

    const response = await axios.post(`${ML_API}/explain`, payload, {
      timeout: 10000,
    });

    res.json(response.data);
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "ML service unavailable",
      });
    }
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    logger.error(`[ML] Explain error: ${error.message}`);
    next(error);
  }
};
