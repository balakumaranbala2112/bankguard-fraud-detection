const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Invalid email format"],
    },

    // Login PIN — hashed by pre-save hook; validated (4 digits) in controller BEFORE hashing
    pin: {
      type: String,
      required: true,
      select: false,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => /^\+[1-9]\d{9,14}$/.test(v),
        message: "Invalid phone format — use +91XXXXXXXXXX",
      },
      index: true
    },

    accountNumber: {
      type: String,
      unique: true,
      index: true
    },

    balance: {
      type: Number,
      default: 50000,
      min: 0,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    usualLocation: {
      type: String,
      default: null,   // null = not yet learned; bootstrapped on first transaction
    },

    usualAmountMin: {
      type: Number,
      default: 0,      // unknown until first transaction
    },

    usualAvgAmount: {
      type: Number,
      default: 0,      // 0 = no history yet; computed live from Transaction history
    },

    usualAmountMax: {
      type: Number,
      default: 0,      // unknown until first transaction
    },

    usualHourStart: {
      type: Number,
      default: 9,
    },

    usualHourEnd: {
      type: Number,
      default: 22,
    },

    // Account numbers this user has sent to before
    knownBeneficiaries: {
      type: [String],
      default: [],
      validate: [arr => arr.length <= 50, "Too many beneficiaries"],
    },

    // FEATURE 7: Push notification subscription
    pushSubscription: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // FEATURE 10: Known device fingerprints for 2FA
    knownDevices: {
      type: [String],
      default: [],
    },

    // FEATURE 18: Login attempt lockout
    loginAttempts: { type: Number, default: 0 },
    lockUntil:     { type: Date,   default: null },

    // FEATURE 19: Transaction PIN (hashed, optional)
    transactionPin:    { type: String, select: false, default: null },
    hasTransactionPin: { type: Boolean, default: false },

    // FEATURE 25: Daily / weekly transaction limits (INR)
    dailyLimit:  { type: Number, default: 100000 },
    weeklyLimit: { type: Number, default: 500000 },
  },
  { timestamps: true },
);

// --------------------------------------------------------
// Auto generate account number before saving
// --------------------------------------------------------
userSchema.pre("save", async function () {
  if (!this.accountNumber) {
    // Fix 17: loop until a genuinely unique account number is found
    let candidate;
    do {
      candidate = "BG" + Math.floor(10000000 + Math.random() * 90000000);
    } while (await mongoose.model("User").exists({ accountNumber: candidate }));
    this.accountNumber = candidate;
  }

  if (this.isModified("pin")) {
    this.pin = await bcrypt.hash(this.pin, 10);
  }
});

// --------------------------------------------------------
// Compare pin during login
// --------------------------------------------------------
userSchema.methods.comparePin = function (enteredPin) {
  return bcrypt.compare(enteredPin, this.pin);
};

module.exports = mongoose.model("User", userSchema);
