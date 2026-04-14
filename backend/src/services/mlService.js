// src/services/mlService.js

const axios  = require("axios");
const logger = require("../utils/logger");

const ML_URL = process.env.ML_API_URL || "http://localhost:5000";

const mlService = {
  // --------------------------------------------------------
  // Main function — send real behavioral features to Flask
  // Features are exactly the 10 the XGBoost model was trained on:
  //   amount, amount_to_avg_ratio, amount_to_max_ratio,
  //   amount_to_balance_ratio, velocity_2min, velocity_1hr,
  //   is_known_beneficiary, is_new_location, transaction_hour,
  //   days_since_last_txn
  // --------------------------------------------------------
  async predictFraud(transactionData) {
    try {
      logger.info("🤖 Sending transaction to ML model...");

      const response = await axios.post(
        `${ML_URL}/predict`,
        transactionData,   // forward the object directly — Flask reads feature_names.pkl order
        { timeout: 10000 }
      );

      logger.info(
        `✅ ML result: ${response.data.risk_level} | prob: ${response.data.probability} | ${response.data.attack_type}`
      );

      return response.data;
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        logger.error("❌ Flask ML server is not running");
        throw new Error("ML service unavailable — start Flask server first");
      }

      if (error.code === "ECONNABORTED") {
        logger.error("❌ ML server request timed out");
        throw new Error("ML service timeout — try again");
      }

      logger.error(`❌ ML Service Error: ${error.message}`);
      throw new Error("Fraud detection service unavailable");
    }
  },

  // --------------------------------------------------------
  // Health check — verify Flask is running
  // --------------------------------------------------------
  async healthCheck() {
    try {
      const response = await axios.get(`${ML_URL}/health`, { timeout: 5000 });
      logger.info("✅ Flask ML server is healthy");
      return response.data;
    } catch (error) {
      logger.error("❌ Flask ML server is down");
      throw new Error("ML service is not running");
    }
  },
};

module.exports = mlService;
