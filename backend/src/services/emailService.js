// src/services/emailService.js
// FEATURE 6: Email Notifications using Nodemailer

const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

// ── Create transporter ─────────────────────────────────────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("[Email] EMAIL_USER or EMAIL_PASS not set — emails disabled");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,  // Gmail App Password
    },
  });

  return transporter;
}

// ── HTML email base template ───────────────────────────────────────────────
function buildEmailHtml(title, bodyHtml, ctaText = null, ctaNote = null) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8faff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,53,245,0.08);border:1px solid #e4ebfd;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e35f5 0%,#3b52ff 100%);padding:28px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(255,255,255,0.15);border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-size:18px;">🛡️</span>
                </td>
                <td style="padding-left:10px;">
                  <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.3px;">BankGuard</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.4px;">${title}</h2>
            ${bodyHtml}
            ${ctaText ? `<p style="margin:24px 0 4px;font-size:12px;color:#94a3b8;text-align:center;">${ctaText}</p>` : ""}
            ${ctaNote ? `<p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">${ctaNote}</p>` : ""}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8faff;padding:20px 32px;border-top:1px solid #e4ebfd;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} BankGuard · Intelligent Fraud Detection</p>
            <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">This is an automated notification. Do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Generic send helper ────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) return { success: false, reason: "Email not configured" };

  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || `"BankGuard Security" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`[Email] Sent "${subject}" to ${to}`);
    return { success: true };
  } catch (err) {
    logger.warn(`[Email] Failed to send to ${to}: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

// ── Feature emails ─────────────────────────────────────────────────────────

async function sendWelcomeEmail(user) {
  const html = buildEmailHtml(
    `Welcome to BankGuard, ${user.name}!`,
    `<p style="color:#475569;line-height:1.7;margin:0 0 16px;">Your account has been created successfully. Here are your details:</p>
    <div style="background:#f8faff;border-radius:10px;padding:20px;border:1px solid #e4ebfd;margin-bottom:16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;"><strong style="color:#0f172a;">Account Number:</strong> ${user.accountNumber}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;"><strong style="color:#0f172a;">Email:</strong> ${user.email}</p>
      <p style="margin:0;font-size:13px;color:#64748b;"><strong style="color:#0f172a;">Starting Balance:</strong> ₹50,000</p>
    </div>
    <p style="color:#475569;line-height:1.7;margin:0;font-size:14px;">Your transactions are protected by our XGBoost ML fraud detection engine, running 24/7.</p>`,
    "Keep this email safe — your account number is important.",
    "If you did not create this account, contact support immediately."
  );

  return sendEmail({
    to: user.email,
    subject: "🛡️ Welcome to BankGuard — Account Created",
    html,
  });
}

async function sendLoginEmail(user, ipAddress) {
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const html = buildEmailHtml(
    "New Login Detected",
    `<p style="color:#475569;line-height:1.7;margin:0 0 16px;">We detected a new sign-in to your BankGuard account.</p>
    <div style="background:#f8faff;border-radius:10px;padding:20px;border:1px solid #e4ebfd;margin-bottom:16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;"><strong style="color:#0f172a;">Time:</strong> ${time} IST</p>
      <p style="margin:0;font-size:13px;color:#64748b;"><strong style="color:#0f172a;">IP Address:</strong> ${ipAddress || "Unknown"}</p>
    </div>
    <p style="color:#475569;line-height:1.7;margin:0;font-size:14px;">If this was you, no action is needed. If not, please change your PIN immediately.</p>`,
    null,
    "This notification was sent to keep your account secure."
  );

  return sendEmail({
    to: user.email,
    subject: "🔐 BankGuard — New Login Detected",
    html,
  });
}

async function sendTransactionApprovedEmail(sender, transaction, receiverName) {
  const amt = `₹${transaction.amount.toLocaleString("en-IN")}`;
  const html = buildEmailHtml(
    "Transaction Approved ✓",
    `<p style="color:#475569;line-height:1.7;margin:0 0 16px;">Your transaction has been processed successfully.</p>
    <div style="background:#f0fdf4;border-radius:10px;padding:20px;border:1px solid #bbf7d0;margin-bottom:16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#166534;"><strong>Amount Sent:</strong> ${amt}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#166534;"><strong>To:</strong> ${receiverName}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#166534;"><strong>Transaction ID:</strong> ${transaction._id}</p>
      <p style="margin:0;font-size:13px;color:#166534;"><strong>Risk Level:</strong> ${transaction.riskLevel || "LOW"}</p>
    </div>
    <p style="color:#475569;font-size:14px;margin:0;">The funds have been transferred. Your new balance has been updated.</p>`,
  );

  return sendEmail({
    to: sender.email,
    subject: `✅ BankGuard — ${amt} Sent Successfully`,
    html,
  });
}

async function sendTransactionBlockedEmail(sender, transaction) {
  const amt = `₹${transaction.amount.toLocaleString("en-IN")}`;
  const html = buildEmailHtml(
    "Transaction Blocked 🚨",
    `<p style="color:#475569;line-height:1.7;margin:0 0 16px;">Our fraud detection system has blocked a transaction from your account.</p>
    <div style="background:#fef2f2;border-radius:10px;padding:20px;border:1px solid #fecaca;margin-bottom:16px;">
      <p style="margin:0 0 8px;font-size:13px;color:#991b1b;"><strong>Amount:</strong> ${amt}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#991b1b;"><strong>Reason:</strong> ${transaction.attackType?.replace(/_/g, " ") || "Suspicious activity"}</p>
      <p style="margin:0;font-size:13px;color:#991b1b;"><strong>Transaction ID:</strong> ${transaction._id}</p>
    </div>
    <p style="color:#475569;font-size:14px;margin:0 0 12px;">If this was a legitimate transaction, you can submit an appeal from your transaction history page.</p>
    <p style="color:#475569;font-size:14px;margin:0;">No money has been deducted from your account.</p>`,
    "This block was triggered automatically by our ML fraud detection engine.",
    "If you believe this is an error, please submit an appeal in the app."
  );

  return sendEmail({
    to: sender.email,
    subject: `🚨 BankGuard — Transaction Blocked: ${amt}`,
    html,
  });
}

module.exports = {
  sendWelcomeEmail,
  sendLoginEmail,
  sendTransactionApprovedEmail,
  sendTransactionBlockedEmail,
};
