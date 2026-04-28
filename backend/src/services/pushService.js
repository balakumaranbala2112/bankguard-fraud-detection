// src/services/pushService.js
// FEATURE 7: Web Push Notifications

const webpush = require("web-push");
const logger = require("../utils/logger");

// ── VAPID setup ────────────────────────────────────────────────────────────
function initVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_SUBJECT || process.env.VAPID_EMAIL || `mailto:admin@bankguard.local`;

  if (!publicKey || !privateKey) {
    logger.warn("[Push] VAPID keys not set — push notifications disabled");
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  logger.info("[Push] VAPID initialized");
  return true;
}

const vapidReady = initVapid();

// ── Send push to a single subscription ────────────────────────────────────
async function sendPush(subscription, payload) {
  if (!vapidReady) return { success: false, reason: "VAPID not configured" };
  if (!subscription || !subscription.endpoint) {
    return { success: false, reason: "Invalid subscription" };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired/unsubscribed — caller should clean up
      return { success: false, expired: true, reason: "Subscription expired" };
    }
    logger.warn(`[Push] Failed: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

// ── Send push to a user (by their stored subscription) ────────────────────
async function sendPushToUser(user, title, body, data = {}) {
  if (!user?.pushSubscription) return;

  const payload = {
    title,
    body,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: { url: "/dashboard", ...data },
    timestamp: Date.now(),
  };

  const result = await sendPush(user.pushSubscription, payload);

  if (result.expired) {
    // Clear stale subscription from DB
    try {
      const User = require("../models/User");
      await User.findByIdAndUpdate(user._id, { $unset: { pushSubscription: 1 } });
      logger.info(`[Push] Cleared expired subscription for user ${user._id}`);
    } catch (_) {}
  }

  return result;
}

module.exports = { sendPushToUser };
