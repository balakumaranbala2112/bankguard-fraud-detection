const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: String,
    paymentId: {
      type: String,
      unique: true,
    },
    amount: Number,
    status: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
