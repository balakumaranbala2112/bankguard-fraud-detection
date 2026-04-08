// src/services/twilioService.js

const { client, twilioPhone } = require("../config/twilio");
const OTP = require("../models/OTP");
const generateOTP = require("../utils/generateOTP");
const logger = require("../utils/logger");

const twilioService = {
  // --------------------------------------------------------
  // Send OTP for MEDIUM risk transactions
  // --------------------------------------------------------
  async sendOTP(userId, phone, transactionId) {
    try {
      const { otp, expiresAt } = generateOTP();

      await OTP.create({
        userId,
        phone,
        otp,
        transactionId,
        expiresAt,
      });

      await client.messages.create({
        body: `BankGuard Alert: Your OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`,
        from: twilioPhone,
        to: phone,
      });

      logger.info(`✅ OTP sent to ${phone}`);
      return { success: true };
    } catch (error) {
      // ✅ LOG but do NOT throw — OTP record is already saved, SMS is best-effort
      logger.warn(`⚠️ OTP SMS failed (non-fatal): ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // --------------------------------------------------------
  // Verify OTP entered by user
  // --------------------------------------------------------
  async verifyOTP(userId, phone, enteredOTP, transactionId) {
    try {
      // Step 1 — Find latest unused OTP for this user
      const otpRecord = await OTP.findOne({
        userId: userId,
        phone: phone,
        transactionId: transactionId,
        isUsed: false,
      }).sort({ createdAt: -1 });

      // Step 2 — Check OTP exists
      if (!otpRecord) {
        return {
          success: false,
          error: "OTP not found — request a new one",
        };
      }

      // Step 3 — Validate OTP using model method
      const validation = otpRecord.isValid(enteredOTP);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason,
        };
      }

      // Step 4 — Mark OTP as used
      await OTP.findByIdAndUpdate(otpRecord._id, {
        isUsed: true,
      });

      logger.info(`✅ OTP verified for ${phone}`);

      return {
        success: true,
        message: "OTP verified successfully",
      };
    } catch (error) {
      logger.error(`❌ OTP verify failed: ${error.message}`);
      throw new Error("Failed to verify OTP");
    }
  },

  // --------------------------------------------------------
  // Send fraud alert SMS for HIGH risk transactions
  // --------------------------------------------------------
  async sendFraudAlert(phone, amount, attackType) {
    try {
      const attackMap = {
        LARGE_AMOUNT_FRAUD: "Large Amount Fraud",
        ACCOUNT_TAKEOVER: "Account Takeover",
        RAPID_SUCCESSION_FRAUD: "Rapid Succession Fraud",
        ODD_HOUR_FRAUD: "Odd Hour Fraud",
        NEW_BENEFICIARY_FRAUD: "New Beneficiary Fraud",
        PATTERN_ANOMALY: "Pattern Anomaly",
      };

      const attackName = attackMap[attackType] || "Suspicious Activity";

      await client.messages.create({
        body: `🚨 BankGuard FRAUD ALERT: A transaction of Rs ${amount} has been BLOCKED. Attack type: ${attackName}. If this was you contact support immediately.`,
        from: twilioPhone,
        to: phone,
      });

      logger.info(`✅ Fraud alert SMS sent to ${phone}`);
      return { success: true };
    } catch (error) {
      // ✅ LOG but do NOT throw — SMS failure must never block a transaction
      logger.warn(`⚠️ Fraud alert SMS failed (non-fatal): ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = twilioService;
