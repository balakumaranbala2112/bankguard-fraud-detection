// src/services/mlService.js

const axios = require("axios");
const logger = require("../utils/logger");

const ML_URL = process.env.ML_API_URL || "http://localhost:5000";

const mlService = {
  // --------------------------------------------------------
  // Main function — send transaction to Flask
  // --------------------------------------------------------
  async predictFraud(transactionData) {
    try {
      logger.info("🤖 Sending transaction to ML model...");

      const response = await axios.post(
        `${ML_URL}/predict`,
        {
          // V1 to V28 features
          V1: transactionData.v1 || 0,
          V2: transactionData.v2 || 0,
          V3: transactionData.v3 || 0,
          V4: transactionData.v4 || 0,
          V5: transactionData.v5 || 0,
          V6: transactionData.v6 || 0,
          V7: transactionData.v7 || 0,
          V8: transactionData.v8 || 0,
          V9: transactionData.v9 || 0,
          V10: transactionData.v10 || 0,
          V11: transactionData.v11 || 0,
          V12: transactionData.v12 || 0,
          V13: transactionData.v13 || 0,
          V14: transactionData.v14 || 0,
          V15: transactionData.v15 || 0,
          V16: transactionData.v16 || 0,
          V17: transactionData.v17 || 0,
          V18: transactionData.v18 || 0,
          V19: transactionData.v19 || 0,
          V20: transactionData.v20 || 0,
          V21: transactionData.v21 || 0,
          V22: transactionData.v22 || 0,
          V23: transactionData.v23 || 0,
          V24: transactionData.v24 || 0,
          V25: transactionData.v25 || 0,
          V26: transactionData.v26 || 0,
          V27: transactionData.v27 || 0,
          V28: transactionData.v28 || 0,

          // Amount and Time
          Amount: transactionData.amount || 0,
          Time: transactionData.timestamp || 0,

          // Extra context features
          is_new_location: transactionData.isNewLocation || false,
          is_new_beneficiary: transactionData.isNewBeneficiary || false,
          transaction_frequency: transactionData.frequency || 1,
          transaction_hour: transactionData.hour || new Date().getHours(),
        },
        {
          timeout: 10000,
        },
      );

      logger.info(
        `✅ ML result: ${response.data.risk_level} | ${response.data.attack_type}`,
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
      const response = await axios.get(`${ML_URL}/health`, {
        timeout: 5000,
      });
      logger.info("✅ Flask ML server is healthy");
      return response.data;
    } catch (error) {
      logger.error("❌ Flask ML server is down");
      throw new Error("ML service is not running");
    }
  },
};

module.exports = mlService;
