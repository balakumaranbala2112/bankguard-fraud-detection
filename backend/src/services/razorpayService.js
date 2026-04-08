// src/services/razorpayService.js

const razorpay = require("../config/razorpay");
const logger = require("../utils/logger");

const razorpayService = {
  // --------------------------------------------------------
  // Create Razorpay order for APPROVED transactions
  // --------------------------------------------------------
  async createOrder(amount) {
    try {
      const options = {
        amount: amount * 100, // Razorpay needs amount in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      logger.info(`✅ Razorpay order created: ${order.id}`);

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error) {
      logger.error(`❌ Razorpay order failed: ${error.message}`);
      throw new Error("Failed to create payment order");
    }
  },

  // --------------------------------------------------------
  // Verify Razorpay payment signature
  // --------------------------------------------------------
  verifyPayment(orderId, paymentId, signature) {
    try {
      const crypto = require("crypto");
      const body = orderId + "|" + paymentId;
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

      const isValid = expected === signature;

      if (isValid) {
        logger.info(`✅ Payment verified: ${paymentId}`);
      } else {
        logger.warn(`⚠️ Payment verification failed: ${paymentId}`);
      }

      return {
        success: isValid,
        message: isValid
          ? "Payment verified successfully"
          : "Payment verification failed",
      };
    } catch (error) {
      logger.error(`❌ Payment verify error: ${error.message}`);
      throw new Error("Failed to verify payment");
    }
  },
};

module.exports = razorpayService;
