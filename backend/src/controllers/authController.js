// src/controllers/authController.js

const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const logger = require("../utils/logger");

// --------------------------------------------------------
// Register — POST /api/auth/register
// --------------------------------------------------------
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Step 1 — Validate required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    // Step 2 — Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
      });
    }

    // Step 3 — Check if phone already exists
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        error: "Phone number already registered",
      });
    }

    // Step 4 — Create user
    // Password hashed automatically in User.js pre-save hook
    const user = await User.create({
      name,
      email,
      password,
      phone,
    });

    // Step 5 — Generate JWT token
    const token = generateToken(user._id);

    logger.info(`New user registered: ${user.email}`);

    // Step 6 — Return full user object
    // FIX: includes all fields frontend needs
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountNumber: user.accountNumber,
        balance: user.balance,
        role: user.role,
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already registered`,
      });
    }

    logger.error(`Register error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Login — POST /api/auth/login
// --------------------------------------------------------
exports.login = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    // Step 1 — Validate fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Step 2 — Normalize email
    email = email.toLowerCase().trim();

    // Step 3 — Find user with password
    // FIX: select('+password') needed because password has select:false
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Step 4 — Check account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account disabled — contact support",
      });
    }

    // Step 5 — Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Step 6 — Generate token
    const token = generateToken(user._id);

    logger.info(`User login: ${user.email} | IP: ${req.ip}`);

    // Step 7 — Return full user object
    // FIX: was missing phone, accountNumber, balance, role
    // Frontend needs ALL of these:
    //   phone         → OTP modal display
    //   accountNumber → Dashboard header
    //   balance       → Dashboard balance card
    //   role          → Admin page access check
    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountNumber: user.accountNumber,
        balance: user.balance,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get Profile — GET /api/auth/profile
// --------------------------------------------------------
exports.getProfile = async (req, res, next) => {
  try {
    // req.user already set by authMiddleware
    // but we re-fetch to get latest balance
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is disabled",
      });
    }

    // FIX: was returning only id, name, email, phone
    // Frontend refreshProfile() needs accountNumber + balance
    // to update the dashboard balance display after transactions
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountNumber: user.accountNumber,
        balance: user.balance,
        role: user.role,
        usualLocation: user.usualLocation,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    next(error);
  }
};
