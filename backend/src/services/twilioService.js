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
        type: "TRANSACTION", // Fix 15
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
  // Send fraud alert SMS for HIGH and MEDIUM risk transactions
  //
  // HIGH  → OTP required — transaction is being verified
  // MEDIUM → OTP required — suspicious activity detected
  //
  // NOTE: in the current flow BOTH risk levels go to OTP_PENDING,
  // then sendOTP() is called separately to send the actual OTP code.
  // This SMS is just the *warning alert* explaining WHY they are
  // getting an OTP, so users don't ignore it.
  // --------------------------------------------------------
  async sendFraudAlert(phone, amount, attackType, riskLevel = "HIGH") {
    try {
      const attackMap = {
        LARGE_AMOUNT_FRAUD:    "Large Amount Fraud",
        ACCOUNT_TAKEOVER:      "Account Takeover",
        RAPID_SUCCESSION_FRAUD:"Rapid Succession Fraud",
        ODD_HOUR_FRAUD:        "Odd Hour Fraud",
        NEW_BENEFICIARY_FRAUD: "New Beneficiary",
        PATTERN_ANOMALY:       "Pattern Anomaly",
      };

      const attackName = attackMap[attackType] || "Suspicious Activity";
      const amtStr     = `Rs ${amount.toLocaleString("en-IN")}`;

      let body;
      if (riskLevel === "HIGH") {
        body =
          `🚨 BankGuard HIGH RISK ALERT: A transaction of ${amtStr} has been flagged ` +
          `[${attackName}]. An OTP has been sent to verify it is really you. ` +
          `If this was NOT you, do NOT enter the OTP and contact support immediately.`;
      } else {
        body =
          `⚠️ BankGuard SECURITY ALERT: A transaction of ${amtStr} looks unusual ` +
          `[${attackName}]. Please verify it with the OTP being sent to you. ` +
          `If this was not you, ignore the OTP and contact support.`;
      }

      await client.messages.create({ body, from: twilioPhone, to: phone });

      logger.info(`✅ Fraud alert SMS (${riskLevel}) sent to ${phone}`);
      return { success: true };
    } catch (error) {
      // SMS failure MUST never block the transaction or OTP flow
      logger.warn(`⚠️ Fraud alert SMS failed (non-fatal): ${error.message}`);
      return { success: false, error: error.message };
    }
  },
  // Fix 11: Generic SMS helper — used by authController.sendLoginOtp
  async sendSMS(to, body) {
    try {
      await client.messages.create({ body, from: twilioPhone, to });
      logger.info(`✅ SMS sent to ${to}`);
      return { success: true };
    } catch (error) {
      logger.warn(`⚠️ SMS send failed (non-fatal): ${error.message}`);
      return { success: false, error: error.message };
    }
  },
};

module.exports = twilioService;
