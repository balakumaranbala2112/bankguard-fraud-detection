const Transaction = require("../models/Transaction");
const Alert = require("../models/Alert");
const User = require("../models/User");
const Payment = require("../models/Payment");
const BlacklistedIP = require("../models/BlacklistedIP");  // F17
const logger = require("../utils/logger");
const socketIO = require("../utils/socketInstance");  // F2: WebSocket
const bcrypt = require("bcryptjs"); // F19

// Fix 4: Lazy-load ALL optional services — prevents crashes when env vars are missing
const getEmail    = () => { try { return require("../services/emailService"); }  catch (_) { return null; } };
const getPush     = () => { try { return require("../services/pushService"); }   catch (_) { return null; } };
const getTwilio   = () => { try { return require("../services/twilioService"); } catch (_) { return null; } };
const getRazorpay = () => { try { return require("../services/razorpayService"); } catch (_) { return null; } };

async function learnUserPatterns(userId) {
  try {
    const recentApproved = await Transaction.find({
      sender: userId,
      status: "APPROVED",
    })
      .sort({ createdAt: -1 })
      .limit(20);

    if (recentApproved.length < 1) return; // update after even 1 txn

    const amounts = recentApproved.map((t) => t.amount);
    const hours = recentApproved.map((t) => t.transactionHour);
    const avgAmt = amounts.reduce((s, a) => s + a, 0) / amounts.length;

    // ── Infer usualLocation from transaction history ──────────────
    // Count how many approved transactions each location appears in
    const locCount = {};
    recentApproved.forEach((t) => {
      if (t.location && t.location !== "Unknown") {
        const l = t.location.trim().toLowerCase();
        locCount[l] = (locCount[l] || 0) + 1;
      }
    });

    // The city with the most appearances becomes the usualLocation
    const inferredLocation =
      Object.keys(locCount).length > 0
        ? Object.keys(locCount).reduce((a, b) =>
          locCount[a] >= locCount[b] ? a : b,
        )
        : null;

    const updatePayload = {
      usualAvgAmount: Math.round(avgAmt),
      usualAmountMax: Math.max(...amounts),
      usualHourStart: Math.min(...hours),
      usualHourEnd: Math.max(...hours),
    };

    // Only update usualLocation if we have enough signal (3+ txns)
    if (inferredLocation && recentApproved.length >= 3) {
      updatePayload.usualLocation = inferredLocation
        .split(" ")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" "); // capitalize: "mumbai" → "Mumbai"
    }

    await User.findByIdAndUpdate(userId, updatePayload);

    logger.info(
      `Patterns updated — count:${recentApproved.length} avg:₹${Math.round(avgAmt)} ` +
      `max:₹${Math.max(...amounts)} hrs:${Math.min(...hours)}–${Math.max(...hours)}` +
      (updatePayload.usualLocation
        ? ` loc:${updatePayload.usualLocation}`
        : ""),
    );
  } catch (err) {
    logger.error(`Pattern learning error: ${err.message}`);
  }
}

// --------------------------------------------------------
function applyRuleOverride(
  fraudResult,
  {
    amount,
    amountToAvg,
    vel2min,
    currentHour,
    isKnownBeneficiary,
    isNewLocation,
    sender,
    isNewUser,
    historyCount,
  },
) {
  // ── Rule 0 — New user onboarding ───────────────────────────
  // Any user with fewer than 3 approved transactions is in the
  // "onboarding" phase. Their first transactions to unknown
  // beneficiaries are always OTP-challenged regardless of amount.
  //
  // WHY: Global defaults (avg=₹5000, max=₹20000) are used for
  // new users, so ₹500/5000 = 0.1x — far below any ratio threshold.
  // Without this rule a brand-new user can send any small amount
  // to any stranger without any friction, which is unrealistic.
  //
  // LEARNING: after OTP is verified → receiver is added to
  // knownBeneficiaries and learnUserPatterns() stores the real
  // average. Each subsequent transaction re-reads Transaction
  // history so the behavioral baseline grows automatically.
  if (isNewUser && !isKnownBeneficiary) {
    logger.warn(
      `Rule 0 MEDIUM — new account (${historyCount} txns) + unknown beneficiary`,
    );
    return {
      ...fraudResult,
      risk_level: "MEDIUM",
      flag: "AMBER",
      action: "OTP",
      is_fraud: true,
      attack_type: "NEW_BENEFICIARY_FRAUD",
      probability: 0.65,
      confidence: 65,
      message: `New account — please verify your first transaction to this recipient (${historyCount}/3 transactions completed)`,
    };
  }

  // ── Rule 1 — Large amount vs user average ──────────────────
  // Known beneficiary gets relaxed thresholds but NOT a free pass
  // Unknown beneficiary gets strict thresholds
  const highThreshold = isKnownBeneficiary ? 40 : 20;
  const mediumThreshold = isKnownBeneficiary ? 10 : 5;

  if (amountToAvg >= highThreshold && fraudResult.risk_level !== "HIGH") {
    logger.warn(
      `Rule 1 HIGH — ₹${amount} is ${amountToAvg.toFixed(1)}x avg | knownBenef:${isKnownBeneficiary}`,
    );
    return {
      ...fraudResult,
      risk_level: "HIGH",
      flag: "RED",
      action: "OTP",
      is_fraud: true,
      attack_type: "LARGE_AMOUNT_FRAUD",
      probability: 0.92,
      confidence: 92,
      message: isKnownBeneficiary
        ? "Large transfer to a known contact — please verify"
        : "Transaction blocked — amount far exceeds your usual pattern",
    };
  }

  if (
    amountToAvg >= mediumThreshold &&
    amountToAvg < highThreshold &&
    fraudResult.risk_level === "LOW"
  ) {
    logger.warn(
      `Rule 1 MEDIUM — ₹${amount} is ${amountToAvg.toFixed(1)}x avg | knownBenef:${isKnownBeneficiary}`,
    );
    return {
      ...fraudResult,
      risk_level: "MEDIUM",
      flag: "AMBER",
      action: "OTP",
      is_fraud: true,
      attack_type: "LARGE_AMOUNT_FRAUD",
      probability: 0.65,
      confidence: 65,
      message: "Suspicious — amount is unusual for your account",
    };
  }

  // ── Rule 2 — Velocity ──────────────────────────────────────
  if (vel2min >= 3) {
    logger.warn(`Rule override HIGH — velocity: ${vel2min} txns in 2 min`);
    return {
      ...fraudResult,
      risk_level: "HIGH",
      flag: "RED",
      action: "OTP",
      is_fraud: true,
      attack_type: "RAPID_SUCCESSION_FRAUD",
      probability: 0.95,
      confidence: 95,
      message: "Transaction blocked — rapid succession detected",
    };
  }

  // ── Rule 3 — Odd hour + unknown beneficiary ─────────────────
  if (currentHour >= 1 && currentHour <= 5 && !isKnownBeneficiary) {
    logger.warn(
      `Rule override HIGH — odd hour ${currentHour}:00 + new beneficiary`,
    );
    return {
      ...fraudResult,
      risk_level: "HIGH",
      flag: "RED",
      action: "OTP",
      is_fraud: true,
      attack_type: "ODD_HOUR_FRAUD",
      probability: 0.88,
      confidence: 88,
      message: "Transaction blocked — suspicious hour with unknown recipient",
    };
  }

  // ── Rule 4 — New Location (Account Takeover detection) ─────
  // Fires whenever location changes, regardless of beneficiary status.
  // An attacker who hijacks an account can still pay the victim's own
  // known contacts — so knownBeneficiary alone is NOT a safe-pass.
  //
  //   new location + UNKNOWN beneficiary → HIGH  (clear account takeover)
  //   new location + KNOWN  beneficiary  → MEDIUM (suspicious travel/hijack)
  if (isNewLocation) {
    if (!isKnownBeneficiary) {
      logger.warn(
        `Rule override HIGH — new location + unknown beneficiary (ACCOUNT_TAKEOVER)`,
      );
      return {
        ...fraudResult,
        risk_level: "HIGH",
        flag: "RED",
        action: "OTP",
        is_fraud: true,
        attack_type: "ACCOUNT_TAKEOVER",
        probability: 0.88,
        confidence: 88,
        message:
          "Transaction blocked — login from a new location to an unknown recipient",
      };
    }
    if (fraudResult.risk_level === "LOW") {
      logger.warn(`Rule override MEDIUM — new location + known beneficiary`);
      return {
        ...fraudResult,
        risk_level: "MEDIUM",
        flag: "AMBER",
        action: "OTP",
        is_fraud: true,
        attack_type: "ACCOUNT_TAKEOVER",
        probability: 0.72,
        confidence: 72,
        message:
          "Suspicious — transaction from an unusual location, please verify",
      };
    }
  }

  // ── Rule 5 — Balance drain ─────────────────────────────────
  const balanceRatio = sender.balance > 0 ? amount / sender.balance : 0;
  if (
    balanceRatio >= 0.9 &&
    !isKnownBeneficiary &&
    fraudResult.risk_level === "LOW"
  ) {
    logger.warn(
      `Rule override MEDIUM — drains ${(balanceRatio * 100).toFixed(0)}% of balance`,
    );
    return {
      ...fraudResult,
      risk_level: "MEDIUM",
      flag: "AMBER",
      action: "OTP",
      is_fraud: true,
      attack_type: "ACCOUNT_TAKEOVER",
      probability: 0.72,
      confidence: 72,
      message: "Suspicious — large portion of balance to unknown recipient",
    };
  }

  return fraudResult;
}

// --------------------------------------------------------
// Send Money — POST /api/transactions/send
// --------------------------------------------------------
exports.sendMoney = async (req, res, next) => {
  try {
    const {
      receiverAccountNumber,
      amount: rawAmount,
      note,
      location,
      isNewLocation,
      isNewBeneficiary,
      hour,
      transactionPin,
      category,
    } = req.body;

    const amount = Number(rawAmount);

    // Step 1 — Validate
    if (!receiverAccountNumber || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valid receiver account and amount are required",
      });
    }

    // Step 2 — Sender
    const sender = await User.findById(req.user._id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        error: "Sender not found",
      });
    }

    // Step 3 — Receiver
    const receiver = await User.findOne({
      accountNumber: receiverAccountNumber,
    });
    if (!receiver) {
      return res.status(404).json({
        success: false,
        error: "Receiver account not found",
      });
    }

    // Step 4 — Self transfer check
    if (sender._id.toString() === receiver._id.toString()) {
      return res.status(400).json({
        success: false,
        error: "Cannot send money to yourself",
      });
    }

    // Step 5 — Duplicate prevention (10 second window)
    const existing = await Transaction.findOne({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      createdAt: { $gte: new Date(Date.now() - 10 * 1000) },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Duplicate transaction detected",
      });
    }

    // ── Step 6 — Compute behavioral features from transaction history ──

    const history = await Transaction.find({
      sender: sender._id,
      status: "APPROVED",
    })
      .sort({ createdAt: -1 })
      .limit(20);

    const amounts = history.map((t) => t.amount);

    // Use global baseline for new users so large first-time
    // amounts are NOT treated as normal
    const GLOBAL_AVG = 5000.0;
    const GLOBAL_MAX = 20000.0;

    const avgAmount =
      amounts.length > 0
        ? amounts.reduce((s, a) => s + a, 0) / amounts.length
        : GLOBAL_AVG;

    const maxAmount = amounts.length > 0 ? Math.max(...amounts) : GLOBAL_MAX;

    const amountToAvg = avgAmount > 0 ? amount / avgAmount : 1.0;
    const amountToMax = maxAmount > 0 ? amount / maxAmount : 1.0;
    const amountToBal = sender.balance > 0 ? amount / sender.balance : 1.0;

    // Velocity signals — Fix 14: exclude FAILED/BLOCKED to prevent score inflation
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000);
    const oneHrAgo = new Date(Date.now() - 60 * 60 * 1000);
    const VELOCITY_STATUSES = { $in: ["APPROVED", "OTP_PENDING", "PIN_PENDING"] };
    const [vel2min, vel1hr] = await Promise.all([
      Transaction.countDocuments({
        sender: sender._id,
        status: VELOCITY_STATUSES,
        createdAt: { $gte: twoMinsAgo },
      }),
      Transaction.countDocuments({
        sender: sender._id,
        status: VELOCITY_STATUSES,
        createdAt: { $gte: oneHrAgo },
      }),
    ]);

    // Days since last approved transaction
    const lastTxn = history[0];
    const daysSinceLast = lastTxn
      ? Math.min(
        (Date.now() - new Date(lastTxn.createdAt).getTime()) / 86400000,
        30,
      )
      : 30;

    // Context signals — Fix 9: derive isNewBeneficiary server-side only
    const isKnownBeneficiary = sender.knownBeneficiaries?.includes(
      receiver.accountNumber,
    )
      ? 1
      : 0;
    const serverSideIsNewBeneficiary = isKnownBeneficiary === 0;
    const currentHour = hour || new Date().getHours();
    const isNewUser = history.length < 3 ? 1 : 0;

    // ── Auto-detect new location ───────────────────────────────────
    // Compare the location string sent by the browser (Nominatim city)
    // against the user's learned usualLocation.
    //
    // REAL-WORLD BEHAVIOUR:
    //   • New users have no usualLocation (null / empty string)
    //     → no comparison, no flag. Location is BOOTSTRAPPED on their
    //       first approved transaction via learnUserPatterns().
    //   • Returning users: if incoming city ≠ usualLocation → flag.
    //   • usualLocation is automatically updated by learnUserPatterns()
    //     to the most-frequent city in last 20 approved transactions,
    //     so a user who genuinely moves cities will self-heal after a
    //     few OTP-verified transactions from the new city.
    let detectedNewLocation = isNewLocation ? 1 : 0;
    if (
      location &&
      sender.usualLocation &&
      sender.usualLocation.trim() !== ""
    ) {
      const reqLoc = location.trim().toLowerCase();
      const usualLoc = sender.usualLocation.trim().toLowerCase();
      if (reqLoc && usualLoc && reqLoc !== usualLoc) {
        detectedNewLocation = 1;
        logger.info(
          `New location detected: "${location}" vs usual "${sender.usualLocation}"`,
        );
      }
    } else if (
      location &&
      (!sender.usualLocation || sender.usualLocation.trim() === "")
    ) {
      // First-ever transaction — bootstrap their location silently (no flag)
      logger.info(`Bootstrapping usualLocation to "${location}" for new user`);
      await User.findByIdAndUpdate(sender._id, {
        usualLocation: location.trim(),
      });
      detectedNewLocation = 0; // first txn from their real city = normal
    }

    // Balance drain signal — amount >= 90% of balance OR exceeds balance
    const balanceDrain =
      sender.balance > 0 && amount >= sender.balance * 0.9 ? 1 : 0;
    const exceedsBalance = amount > sender.balance ? 1 : 0;

    logger.info(
      `Features | amt:₹${amount} avgRatio:${amountToAvg.toFixed(1)}x ` +
      `maxRatio:${amountToMax.toFixed(1)}x balRatio:${amountToBal.toFixed(2)} ` +
      `vel2m:${vel2min} vel1h:${vel1hr} knownBenef:${isKnownBeneficiary} ` +
      `newLoc:${detectedNewLocation} hr:${currentHour} newUser:${isNewUser} ` +
      `daysSince:${daysSinceLast.toFixed(1)} drain:${balanceDrain}`,
    );

    // Fix 12: Daily / weekly limit check via aggregation
    const dayStart  = new Date(); dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [dailyAgg, weeklyAgg] = await Promise.all([
      Transaction.aggregate([{ $match: { sender: sender._id, status: { $in: ["APPROVED", "OTP_PENDING", "PIN_PENDING"] }, createdAt: { $gte: dayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Transaction.aggregate([{ $match: { sender: sender._id, status: { $in: ["APPROVED", "OTP_PENDING", "PIN_PENDING"] }, createdAt: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    const dailySpent  = dailyAgg[0]?.total  || 0;
    const weeklySpent = weeklyAgg[0]?.total || 0;
    if (dailySpent + amount > sender.dailyLimit) {
      return res.status(400).json({ success: false, error: `Daily limit of ₹${sender.dailyLimit.toLocaleString("en-IN")} exceeded` });
    }
    if (weeklySpent + amount > sender.weeklyLimit) {
      return res.status(400).json({ success: false, error: `Weekly limit of ₹${sender.weeklyLimit.toLocaleString("en-IN")} exceeded` });
    }

    // Step 7 — Call ML model — Fix 5: graceful fallback if Flask is unreachable
    let fraudResult;
    try {
    fraudResult = await require("../services/mlService").predictFraud({
      amount,
      amount_to_avg_ratio: amountToAvg,
      amount_to_max_ratio: amountToMax,
      amount_to_balance_ratio: amountToBal,
      velocity_2min: vel2min,
      velocity_1hr: vel1hr,
      is_known_beneficiary: isKnownBeneficiary,
      is_new_location: detectedNewLocation,
      transaction_hour: currentHour,
      days_since_last_txn: daysSinceLast,
      balance_drain: balanceDrain,
      exceeds_balance: exceedsBalance,
    });
    } catch (mlErr) {
      logger.warn(`ML service unreachable — using safe default: ${mlErr.message}`);
      fraudResult = { is_fraud: false, risk_level: "LOW", flag: "GREEN", action: "APPROVE", attack_type: "NONE", probability: 0, confidence: 0, message: "Rule-based processing (ML unavailable)" };
    }

    logger.info(
      `🤖 ML result: ${fraudResult.risk_level} | prob: ${fraudResult.probability}`,
    );

    // Step 7b — Apply rule-based override on top of ML score
    fraudResult = applyRuleOverride(fraudResult, {
      amount,
      amountToAvg,
      vel2min,
      currentHour,
      isKnownBeneficiary,
      isNewLocation: detectedNewLocation,
      sender,
      isNewUser,
      historyCount: history.length, // pass raw count for Rule 0 message
    });

    logger.info(
      `✅ Final result: ${fraudResult.risk_level} | prob: ${fraudResult.probability}`,
    );

    let status = "PENDING";
    let razorpayOrder = null;

    // Step 8 — Take action based on risk level
    if (fraudResult.risk_level === "HIGH") {
      status = "OTP_PENDING";
      // Fraud alert SMS — clearly says OTP is required (not "BLOCKED")
      const _twilio = getTwilio();
      if (_twilio) await _twilio.sendFraudAlert(sender.phone, amount, fraudResult.attack_type, "HIGH").catch(() => {});
      logger.warn(`🔴 HIGH RISK — OTP challenge sent | ₹${amount}`);
    } else if (fraudResult.risk_level === "MEDIUM") {
      status = "OTP_PENDING";
      const _twilio2 = getTwilio();
      if (_twilio2) await _twilio2.sendFraudAlert(sender.phone, amount, fraudResult.attack_type, "MEDIUM").catch(() => {});
      logger.warn(`🟡 MEDIUM RISK — OTP required | ₹${amount}`);
    } else {
      // LOW RISK — check balance first
      if (sender.balance < amount) {
        // Save a TOPUP_REQUIRED transaction first so the frontend has a txnId
        const topupTxn = await Transaction.create({
          sender: sender._id,
          receiver: receiver._id,
          amount,
          status: "TOPUP_REQUIRED",
          riskLevel: fraudResult.risk_level,
          flag: fraudResult.flag,
          attackType: fraudResult.attack_type,
          confidence: fraudResult.confidence,
          location: location || sender.usualLocation || "Unknown",
          isNewLocation: detectedNewLocation === 1,
          isNewBeneficiary: serverSideIsNewBeneficiary, // Fix 9
          transactionHour: currentHour,
          note: note || "",
        });
        const _rp = getRazorpay();
        razorpayOrder = _rp ? await _rp.createOrder(amount) : null;
        return res.json({
          success: true,
          status: "TOPUP_REQUIRED",
          message: "Insufficient balance — please top up",
          transaction: topupTxn,
          razorpayOrder,
          fraud_result: {
            is_fraud: fraudResult.is_fraud,
            risk_level: fraudResult.risk_level,
            flag: fraudResult.flag,
            action: fraudResult.action,
            attack_type: fraudResult.attack_type,
            confidence: fraudResult.confidence,
            probability: fraudResult.probability,
            message: fraudResult.message,
            features: {
              amount,
              amount_to_avg_ratio: amountToAvg,
              amount_to_max_ratio: amountToMax,
              amount_to_balance_ratio: amountToBal,
              velocity_2min: vel2min,
              velocity_1hr: vel1hr,
              is_known_beneficiary: isKnownBeneficiary,
              is_new_location: detectedNewLocation,
              transaction_hour: currentHour,
              days_since_last_txn: daysSinceLast,
              balance_drain: balanceDrain,
              exceeds_balance: exceedsBalance,
            }
          },
        });
      }

      // Check if user has a transaction PIN:
      // YES → PIN_PENDING (balance NOT deducted yet; deducted in /confirm endpoint)
      // NO  → APPROVED immediately
      const senderForPin = await User.findById(req.user._id).select("hasTransactionPin");
      if (senderForPin?.hasTransactionPin) {
        status = "PIN_PENDING";
        logger.info(`🟡 LOW RISK PIN_PENDING — waiting for 6-digit PIN | ₹${amount}`);
      } else {
        status = "APPROVED";
        logger.info(`🟢 APPROVED (no PIN set) — ₹${amount}`);
      }
    }

    // Step 9 — Save transaction to MongoDB
    const VALID_CATEGORIES = ["FOOD", "RENT", "TRANSFER", "SHOPPING", "UTILITIES", "EDUCATION", "MEDICAL", "OTHER"];
    const transaction = await Transaction.create({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      status,
      riskLevel: fraudResult.risk_level,
      flag: fraudResult.flag,
      attackType: fraudResult.attack_type,
      confidence: fraudResult.confidence,
      location: location || sender.usualLocation || "Unknown",
      isNewLocation: detectedNewLocation === 1,
      isNewBeneficiary: serverSideIsNewBeneficiary, // Fix 9
      transactionHour: currentHour,
      note: note || "",
      category: VALID_CATEGORIES.includes(category) ? category : "TRANSFER", // F23
    });

    // Step 10 — OTP flow
    if (status === "OTP_PENDING") {
      await Transaction.findByIdAndUpdate(transaction._id, {
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        otpAttempts: 0,
      });
      const _twilioOtp = getTwilio();
      if (_twilioOtp) await _twilioOtp.sendOTP(sender._id, sender.phone, transaction._id);
    }

    // Step 11 — Transfer balance immediately for APPROVED — Fix 2: atomic deduction
    if (status === "APPROVED") {
      const deducted = await User.findOneAndUpdate(
        { _id: sender._id, balance: { $gte: amount } },
        { $inc: { balance: -amount } }
      );
      if (!deducted) {
        await Transaction.findByIdAndUpdate(transaction._id, { status: "FAILED" });
        return res.status(400).json({ success: false, error: "Insufficient balance" });
      }
      await User.findByIdAndUpdate(receiver._id, { $inc: { balance: amount } });
      await User.findByIdAndUpdate(sender._id, {
        $addToSet: { knownBeneficiaries: receiver.accountNumber },
      });
      await Transaction.findByIdAndUpdate(transaction._id, { status: "APPROVED" });
      await learnUserPatterns(sender._id);
    }

    // Step 12 — Save alert if fraud detected
    if (fraudResult.is_fraud) {
      await Alert.create({
        userId: sender._id,
        transactionId: transaction._id,
        alertType:
          fraudResult.risk_level === "HIGH" ? "FRAUD_BLOCKED" : "OTP_TRIGGERED",
        attackType: fraudResult.attack_type,
        riskLevel: fraudResult.risk_level,
        flag: fraudResult.flag,
        amount,
        message: fraudResult.message,
        smsSent: true,
      });
    }

    // FEATURE 2: Emit WebSocket events (non-blocking)
    setImmediate(() => {
      const txnPayload = {
        _id: transaction._id,
        amount,
        status,
        riskLevel: fraudResult.risk_level,
        flag: fraudResult.flag,
        attackType: fraudResult.attack_type,
        sender: { name: sender.name, accountNumber: sender.accountNumber },
        receiver: { name: receiver.name, accountNumber: receiver.accountNumber },
        createdAt: transaction.createdAt,
      };
      socketIO.emitToAdmin("new_transaction", txnPayload);
      if (status === "BLOCKED" || (fraudResult.risk_level === "HIGH" && status === "OTP_PENDING")) {
        socketIO.emitToAdmin("fraud_alert", {
          ...txnPayload,
          message: fraudResult.message,
        });
      }
    });

    // FEATURE 6: Email notifications (non-blocking)
    setImmediate(async () => {
      const es = getEmail();
      if (!es) return;
      try {
        if (status === "APPROVED") {
          await es.sendTransactionApprovedEmail(sender, transaction, receiver.name);
        } else if (status === "BLOCKED" || fraudResult.risk_level === "HIGH") {
          await es.sendTransactionBlockedEmail(sender, transaction);
        }
      } catch (_) { }
    });

    // FEATURE 7: Push notifications (non-blocking)
    setImmediate(async () => {
      const ps = getPush();
      if (!ps) return;
      try {
        // Notify receiver of incoming transfer
        const freshReceiver = await User.findById(receiver._id).lean();
        if (freshReceiver?.pushSubscription && status === "APPROVED") {
          await ps.sendPushToUser(
            freshReceiver,
            `💰 ₹${amount.toLocaleString("en-IN")} received`,
            `From ${sender.name}`,
            { url: "/history" }
          );
        }
        // Notify sender if blocked
        const freshSenderPush = await User.findById(sender._id).lean();
        if (freshSenderPush?.pushSubscription && fraudResult.risk_level !== "LOW") {
          const pushTitle = status === "BLOCKED"
            ? `🚨 Transaction blocked — ₹${amount.toLocaleString("en-IN")}`
            : `⚠️ OTP required for ₹${amount.toLocaleString("en-IN")}`;
          await ps.sendPushToUser(
            freshSenderPush,
            pushTitle,
            fraudResult.message,
            { url: "/history" }
          );
        }
      } catch (_) { }
    });

    // Step 13 — Return full result — Fix 13: re-fetch for fresh data
    const freshTransaction = await Transaction.findById(transaction._id);
    res.json({
      success: true,
      status,
      transaction: freshTransaction,
      razorpayOrder,
      fraud_result: {
        is_fraud: fraudResult.is_fraud,
        risk_level: fraudResult.risk_level,
        flag: fraudResult.flag,
        action: fraudResult.action,
        attack_type: fraudResult.attack_type,
        confidence: fraudResult.confidence,
        probability: fraudResult.probability,
        message: fraudResult.message,
        features: {
          amount,
          amount_to_avg_ratio: amountToAvg,
          amount_to_max_ratio: amountToMax,
          amount_to_balance_ratio: amountToBal,
          velocity_2min: vel2min,
          velocity_1hr: vel1hr,
          is_known_beneficiary: isKnownBeneficiary,
          is_new_location: detectedNewLocation,
          transaction_hour: currentHour,
          days_since_last_txn: daysSinceLast,
          balance_drain: balanceDrain,
          exceeds_balance: exceedsBalance,
        }
      },
    });
  } catch (error) {
    logger.error(`Send money error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Verify OTP — POST /api/transactions/verify-otp
// --------------------------------------------------------
exports.verifyOTP = async (req, res, next) => {
  try {
    const { transactionId, otp } = req.body;

    if (!transactionId || !otp) {
      return res.status(400).json({
        success: false,
        error: "Transaction ID and OTP are required",
      });
    }

    // Bug 4: atomic status flip + checking expiry and attempts inside the filter
    const transaction = await Transaction.findOneAndUpdate(
      { 
        _id: transactionId, 
        status: "OTP_PENDING",
        otpExpiresAt: { $gt: new Date() },
        otpAttempts: { $lt: 5 }
      },
      { $set: { status: "PROCESSING" } },
      { new: false } // return the original doc so we can inspect it
    );

    if (!transaction) {
      const t = await Transaction.findById(transactionId);
      if (!t) return res.status(404).json({ success: false, error: "Transaction not found" });
      if (t.status !== "OTP_PENDING") return res.status(400).json({ success: false, error: "Transaction already processed" });
      if (t.otpAttempts >= 5) return res.status(400).json({ success: false, error: "Too many OTP attempts" });
      return res.status(400).json({ success: false, error: "OTP expired — request a new one" });
    }

    // Fix 7: ownership check — only the sender can verify their own OTP
    if (transaction.sender.toString() !== req.user._id.toString()) {
      // Revert the status flip since this request is unauthorized
      await Transaction.findByIdAndUpdate(transactionId, { $set: { status: "OTP_PENDING" } });
      return res.status(403).json({ success: false, error: "Unauthorized — this is not your transaction" });
    }

    // Bug 1: fix undefined twilioService
    const _twilio = getTwilio();
    if (!_twilio) {
      await Transaction.findByIdAndUpdate(transactionId, { $set: { status: "OTP_PENDING" } });
      return res.status(503).json({ success: false, error: "OTP service unavailable" });
    }

    const result = await _twilio.verifyOTP(
      req.user._id,
      req.user.phone,
      otp,
      transactionId,
    );

    if (!result.success) {
      // Bug 6: Revert to OTP_PENDING so user can retry
      await Transaction.findByIdAndUpdate(transactionId, {
        $set: { status: "OTP_PENDING" },
        $inc: { otpAttempts: 1 },
      });
      return res.status(400).json({ success: false, error: result.error });
    }

    const freshSender = await User.findById(transaction.sender);
    if (!freshSender) {
      await Transaction.findByIdAndUpdate(transactionId, { $set: { status: "OTP_PENDING" } });
      return res.status(404).json({ success: false, error: "Sender not found" });
    }

    // Bug 9: Check daily/weekly limits before completing
    const dayStart  = new Date(); dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [dailyAgg, weeklyAgg] = await Promise.all([
      Transaction.aggregate([{ $match: { sender: freshSender._id, status: { $in: ["APPROVED", "OTP_PENDING", "PIN_PENDING"] }, createdAt: { $gte: dayStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Transaction.aggregate([{ $match: { sender: freshSender._id, status: { $in: ["APPROVED", "OTP_PENDING", "PIN_PENDING"] }, createdAt: { $gte: weekStart } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    const dailySpent  = dailyAgg[0]?.total  || 0;
    const weeklySpent = weeklyAgg[0]?.total || 0;
    
    // Note: Since this transaction is currently in "PROCESSING" (changed from "OTP_PENDING"),
    // it was not included in the agg matches above. So we must add its amount to check the limit.
    if (dailySpent + transaction.amount > freshSender.dailyLimit) {
      await Transaction.findByIdAndUpdate(transactionId, { status: "FAILED" });
      return res.status(400).json({ success: false, error: `Daily limit of ₹${freshSender.dailyLimit.toLocaleString("en-IN")} exceeded` });
    }
    if (weeklySpent + transaction.amount > freshSender.weeklyLimit) {
      await Transaction.findByIdAndUpdate(transactionId, { status: "FAILED" });
      return res.status(400).json({ success: false, error: `Weekly limit of ₹${freshSender.weeklyLimit.toLocaleString("en-IN")} exceeded` });
    }

    if (freshSender.balance < transaction.amount) {
      // They verified OTP but they are broke. Send them to payment gateway.
      const _rp = getRazorpay();
      const razorpayOrder = _rp ? await _rp.createOrder(transaction.amount) : null;

      const updatedTransaction = await Transaction.findByIdAndUpdate(
        transactionId,
        { status: "TOPUP_REQUIRED", otpVerified: true },
        { new: true }
      );

      return res.json({
        success: true,
        message: "OTP verified — please top up balance to complete transfer",
        requiresPayment: true,
        razorpayOrder,
        transaction: updatedTransaction,
      });
    }

    // Fix 1: atomic balance deduction — only deduct if balance is still sufficient
    const deductedSender = await User.findOneAndUpdate(
      { _id: transaction.sender, balance: { $gte: transaction.amount } },
      { $inc: { balance: -transaction.amount } }
    );
    if (!deductedSender) {
      await Transaction.findByIdAndUpdate(transactionId, { status: "FAILED" });
      return res.status(400).json({ success: false, error: "Insufficient balance" });
    }
    await User.findByIdAndUpdate(transaction.receiver, {
      $inc: { balance: transaction.amount },
    });

    const receiverUser = await User.findById(transaction.receiver);
    if (receiverUser) {
      await User.findByIdAndUpdate(transaction.sender, {
        $addToSet: { knownBeneficiaries: receiverUser.accountNumber },
      });
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { status: "APPROVED", otpVerified: true },
      { new: true },
    );

    await learnUserPatterns(transaction.sender);

    logger.info("OTP verified — transaction approved");

    // Fix 13: re-fetch for fresh, accurate data
    const freshTxn = await Transaction.findById(transactionId);
    res.json({
      success: true,
      message: "OTP verified — transaction approved",
      requiresPayment: false,
      razorpayOrder: null,
      transaction: freshTxn,
    });
  } catch (error) {
    logger.error(`OTP verify error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get History — GET /api/transactions/history
// --------------------------------------------------------
exports.getHistory = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const { status, type, startDate, endDate } = req.query;

    const baseQuery = {
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    };

    if (status) baseQuery.status = status;

    if (startDate || endDate) {
      baseQuery.createdAt = {};
      if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) baseQuery.createdAt.$lte = new Date(endDate);
    }

    if (type === "sent") {
      baseQuery.sender = req.user._id;
      delete baseQuery.$or;
    } else if (type === "received") {
      baseQuery.receiver = req.user._id;
      delete baseQuery.$or;
    }

    // Fix 10: populate excludes 'phone' to prevent PII leak to frontend
    const [transactions, total] = await Promise.all([
      Transaction.find(baseQuery)
        .populate("sender",   "name accountNumber")
        .populate("receiver", "name accountNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(baseQuery),
    ]);

    res.json({
      success: true,
      count: transactions.length,
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error(`Get history error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Get Alerts — GET /api/transactions/alerts
// --------------------------------------------------------
exports.getAlerts = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const { type, isRead } = req.query;

    const query = { userId: req.user._id };
    if (type) query.alertType = type;
    if (isRead !== undefined) query.isRead = isRead === "true";

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .populate("transactionId", "amount status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: alerts.length,
      alerts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error(`Get alerts error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Recent Recipients — GET /api/transactions/recent-recipients
// --------------------------------------------------------
exports.getRecentRecipients = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({
      sender: req.user._id,
      status: "APPROVED",
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("receiver", "name accountNumber")
      .lean();

    const seen = new Set();
    const recipients = [];
    for (const txn of transactions) {
      const acc = txn.receiver?.accountNumber;
      if (acc && !seen.has(acc)) {
        seen.add(acc);
        recipients.push({ name: txn.receiver.name, accountNumber: acc });
        if (recipients.length >= 5) break;
      }
    }

    res.json({ success: true, recipients });
  } catch (error) {
    logger.error(`Recent recipients error: ${error.message}`);
    next(error);
  }
};

// --------------------------------------------------------
// Verify Razorpay Payment — POST /api/transactions/verify-payment
// --------------------------------------------------------
exports.verifyPayment = async (req, res, next) => {
  try {
    const transactionId = req.params.id || req.body.transactionId;
    const { orderId, paymentId, signature } = req.body;

    if (!transactionId || !orderId || !paymentId || !signature) {
      return res
        .status(400)
        .json({ success: false, error: "Missing payment details" });
    }

    // Step 1 — Verify Razorpay signature
    const result = razorpayService.verifyPayment(orderId, paymentId, signature);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, error: "Payment verification failed" });
    }

    // Step 2 — Idempotency check
    const existingPayment = await Payment.findOne({ paymentId });
    if (existingPayment) {
      return res
        .status(400)
        .json({ success: false, error: "Payment already processed" });
    }

    // Step 3 — Load the pending transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, error: "Transaction not found" });
    }
    if (transaction.status !== "TOPUP_REQUIRED") {
      return res
        .status(400)
        .json({ success: false, error: "Transaction is not awaiting payment" });
    }

    const amount = transaction.amount;

    // Step 4 — Top up sender wallet so balance is sufficient
    await User.findByIdAndUpdate(transaction.sender, {
      $inc: { balance: amount },
    });

    // Step 5 — Record the Razorpay payment
    await Payment.create({
      userId: transaction.sender,
      orderId,
      paymentId,
      amount,
      status: "SUCCESS",
    });

    // Step 6 — Complete the actual money transfer
    await User.findByIdAndUpdate(transaction.sender, {
      $inc: { balance: -amount },
    });
    await User.findByIdAndUpdate(transaction.receiver, {
      $inc: { balance: amount },
    });

    // Step 7 — Add receiver to sender's known beneficiaries
    const receiverUser = await User.findById(transaction.receiver);
    if (receiverUser) {
      await User.findByIdAndUpdate(transaction.sender, {
        $addToSet: { knownBeneficiaries: receiverUser.accountNumber },
      });
    }

    // Step 8 — Mark transaction APPROVED
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { status: "APPROVED" },
      { new: true },
    );

    // Step 9 — Learn updated patterns
    await learnUserPatterns(transaction.sender);

    logger.info(`Payment verified & transfer completed: ${paymentId} — ₹${amount}`);

    res.json({
      success: true,
      message: "Payment verified — transfer completed",
      transaction: updatedTransaction,
    });
  } catch (error) {
    logger.error(`Payment verify error: ${error.message}`);
    next(error);
  }
};

exports.confirmTransaction = async (req, res, next) => {
  try {
    const transactionId = req.params.id || req.body.transactionId;
    const { transactionPin } = req.body;

    if (!transactionId || !transactionPin) {
      return res.status(400).json({ success: false, error: "Transaction ID and PIN are required" });
    }

    // Fix 3: atomic status flip — PIN_PENDING → PROCESSING prevents double-spend
    const transaction = await Transaction.findOneAndUpdate(
      { _id: transactionId, status: "PIN_PENDING" },
      { $set: { status: "PROCESSING" } },
      { new: false }
    );
    if (!transaction) {
      return res.status(404).json({ success: false, error: "Transaction not found or already processed" });
    }

    // Verify sender
    if (transaction.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const sender = await User.findById(req.user._id).select("+transactionPin hasTransactionPin balance phone");
    if (!sender.hasTransactionPin) {
      return res.status(400).json({ success: false, error: "No transaction PIN set" });
    }

    const bcrypt = require("bcryptjs");
    const pinOk = await bcrypt.compare(String(transactionPin), sender.transactionPin);
    if (!pinOk) {
      return res.status(401).json({ success: false, error: "Incorrect Transaction PIN" });
    }

    // Fix 3: atomic balance deduction — prevents concurrent double-spend
    const deductedForPin = await User.findOneAndUpdate(
      { _id: transaction.sender, balance: { $gte: transaction.amount } },
      { $inc: { balance: -transaction.amount } }
    );
    if (!deductedForPin) {
      await Transaction.findByIdAndUpdate(transaction._id, { status: "FAILED" });
      return res.status(400).json({ success: false, error: "Insufficient balance" });
    }
    await User.findByIdAndUpdate(transaction.receiver, { $inc: { balance: transaction.amount } });

    // Add to known beneficiaries
    const receiver = await User.findById(transaction.receiver);
    if (receiver) {
      await User.findByIdAndUpdate(transaction.sender, {
        $addToSet: { knownBeneficiaries: receiver.accountNumber },
      });
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transaction._id,
      { status: "APPROVED" },
      { new: true }
    );

    await learnUserPatterns(transaction.sender);

    // FEATURE 2: Emit WebSocket events
    const io = require("../../app").io;
    if (io) {
      io.to(sender._id.toString()).emit("transaction_update", updatedTransaction);
      io.to(receiver._id.toString()).emit("transaction_update", updatedTransaction);
      io.emit("admin_dashboard_update");
    }

    res.json({
      success: true,
      message: "Transfer successful",
      transaction: updatedTransaction,
    });
  } catch (error) {
    logger.error(`Transaction confirm error: ${error.message}`);
    next(error);
  }
};
