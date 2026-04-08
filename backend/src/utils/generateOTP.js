// src/utils/generateOTP.js

const generateOTP = () => {
  // Generate random 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // OTP expiry — 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  return { otp, expiresAt };
};

module.exports = generateOTP;
