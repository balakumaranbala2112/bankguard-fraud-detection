// src/services/mlService.js

const axios = require("axios");
const logger = require("../utils/logger");

const ML_URL     = process.env.ML_API_URL  || "http://localhost:5000";
// Fix 20: shared secret sent as a header so Flask can reject unauthorized callers
const ML_API_KEY = process.env.ML_API_KEY  || "";

const ML_HEADERS = ML_API_KEY ? { "X-ML-API-Key": ML_API_KEY } : {};

const mlService = {
  // --------------------------------------------------------
  // Main function — send real behavioral features to Flask
  // --------------------------------------------------------
  async predictFraud(transactionData) {
    try {
      logger.info("Sending transaction to ML model...");

      const response = await axios.post(
        `${ML_URL}/predict`,
        transactionData,
        { timeout: 10000, headers: ML_HEADERS } // Fix 20
      );

      logger.info(
        `ML result: ${response.data.risk_level} | prob: ${response.data.probability} | ${response.data.attack_type}`
      );

      return response.data;
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        logger.error("Flask ML server is not running");
        throw new Error("ML service unavailable — start Flask server first");
      }

      if (error.code === "ECONNABORTED") {
        logger.error("ML server request timed out");
        throw new Error("ML service timeout — try again");
      }

      logger.error(`ML Service Error: ${error.message}`);
      throw new Error("Fraud detection service unavailable");
    }
  },

  // --------------------------------------------------------
  // Health check — verify Flask is running
  // --------------------------------------------------------
  async healthCheck() {
    try {
      const response = await axios.get(`${ML_URL}/health`, { timeout: 5000, headers: ML_HEADERS }); // Fix 20
      logger.info("Flask ML server is healthy");
      return response.data;
    } catch (error) {
      logger.error("Flask ML server is down");
      throw new Error("ML service is not running");
    }
  },
};

module.exports = mlService;
