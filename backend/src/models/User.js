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
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
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
    },

    accountNumber: {
      type: String,
      unique: true,
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

    // ── Pattern fields — define each user's normal behavior ──
    // NOTE: these start as null/0 for new users and are populated
    // automatically by learnUserPatterns() as they transact.
    // We deliberately do NOT set fake defaults (like "Chennai") because
    // a hardcoded city would incorrectly flag every real city as "new location".
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
    },
  },
  { timestamps: true },
);

// --------------------------------------------------------
// Auto generate account number before saving
// --------------------------------------------------------
userSchema.pre("save", async function () {
  if (!this.accountNumber) {
    this.accountNumber = "BG" + Math.floor(10000000 + Math.random() * 90000000);
  }

  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

// --------------------------------------------------------
// Compare password during login
// --------------------------------------------------------
userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
