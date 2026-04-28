// src/controllers/reportController.js — F13: Monthly Fraud Report PDF
const PDFDocument = require("pdfkit");
const Transaction = require("../models/Transaction");
const User        = require("../models/User");
const logger      = require("../utils/logger");
const path        = require("path");
const fs          = require("fs");

const REPORTS_DIR = path.join(__dirname, "../../reports");

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const C = {
  brand: "#2563eb", brandDark: "#1e3a8a", brandMid: "#3b82f6",
  ink: "#0f172a", muted: "#64748b", subtle: "#94a3b8",
  border: "#e2e8f0", surface: "#f8fafc", white: "#ffffff",
  green: "#16a34a", greenBg: "#dcfce7",
  red: "#dc2626", redBg: "#fee2e2",
  amber: "#d97706", amberBg: "#fef3c7",
};

// ── Internal PDF builder ───────────────────────────────────────────────────
async function buildMonthlyReportPDF(doc, targetMonth, targetYear) {
  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate   = new Date(targetYear, targetMonth, 1);

  const [stats, topAmounts, attackBreakdown, hourlyPattern, recentFraud] = await Promise.all([
    // Aggregate stats
    Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      {
        $group: {
          _id: null,
          total:    { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } },
          blocked:  { $sum: { $cond: [{ $eq: ["$status", "BLOCKED"] }, 1, 0] } },
          otp:      { $sum: { $cond: [{ $eq: ["$status", "OTP_PENDING"] }, 1, 0] } },
          volume:   { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, "$amount", 0] } },
          highRisk: { $sum: { $cond: [{ $eq: ["$riskLevel", "HIGH"] }, 1, 0] } },
          medRisk:  { $sum: { $cond: [{ $eq: ["$riskLevel", "MEDIUM"] }, 1, 0] } },
          lowRisk:  { $sum: { $cond: [{ $eq: ["$riskLevel", "LOW"] }, 1, 0] } },
        },
      },
    ]),
    // Top amounts blocked
    Transaction.find({ status: "BLOCKED", createdAt: { $gte: startDate, $lt: endDate } })
      .sort({ amount: -1 }).limit(5)
      .populate("sender", "name accountNumber"),
    // Attack type breakdown
    Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate }, attackType: { $ne: "NONE" } } },
      { $group: { _id: "$attackType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Hourly pattern
    Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate }, status: "BLOCKED" } },
      { $group: { _id: "$transactionHour", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Recent fraud
    Transaction.find({ status: "BLOCKED", createdAt: { $gte: startDate, $lt: endDate } })
      .sort({ createdAt: -1 }).limit(10)
      .populate("sender", "name accountNumber"),
  ]);

  const s = stats[0] || { total: 0, approved: 0, blocked: 0, otp: 0, volume: 0, highRisk: 0, medRisk: 0, lowRisk: 0 };
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthName = MONTHS[targetMonth - 1];

  const W = doc.page.width;
  const PAD = 48;
  let y = 0;

  // ── Header ───────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, 110).fill(C.brandDark);
  doc.save().circle(W + 20, -40, 140).fill(C.brandMid).opacity(0.3).restore();

  doc.fill(C.white).fontSize(22).font("Helvetica-Bold").text("BankGuard", PAD, 28);
  doc.fill(C.white).opacity(0.6).fontSize(9).font("Helvetica").text("Monthly Fraud Intelligence Report", PAD, 56);
  doc.opacity(1);
  doc.fill(C.white).opacity(0.9).fontSize(14).font("Helvetica-Bold")
    .text(`${monthName} ${targetYear}`, 0, 34, { align: "right", width: W - PAD });
  doc.fill(C.white).opacity(0.5).fontSize(9).font("Helvetica")
    .text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 0, 58, { align: "right", width: W - PAD });
  doc.opacity(1);

  y = 128;

  // ── Summary Stat Cards ────────────────────────────────────────────────────
  const cardW = (W - PAD * 2 - 12) / 4;
  const cards = [
    { label: "TOTAL TRANSACTIONS", val: s.total.toString(), color: C.brand },
    { label: "APPROVED",           val: s.approved.toString(), color: C.green },
    { label: "BLOCKED",            val: s.blocked.toString(), color: C.red },
    { label: "TOTAL VOLUME",       val: `Rs.${(s.volume / 1000).toFixed(1)}K`, color: C.amber },
  ];

  cards.forEach((card, i) => {
    const cx = PAD + i * (cardW + 4);
    doc.roundedRect(cx, y, cardW, 64, 6).fill(C.surface);
    doc.rect(cx, y, cardW, 3).fill(card.color);
    doc.fill(C.subtle).fontSize(7).font("Helvetica").text(card.label, cx + 10, y + 14, { width: cardW - 20 });
    doc.fill(card.color).fontSize(20).font("Helvetica-Bold").text(card.val, cx + 10, y + 29);
  });

  y += 80;

  // ── Risk Distribution ─────────────────────────────────────────────────────
  doc.rect(PAD, y, 3, 14).fill(C.brand);
  doc.fill(C.ink).fontSize(12).font("Helvetica-Bold").text("Risk Distribution", PAD + 10, y + 1);
  y += 24;

  const riskW = (W - PAD * 2) / 3;
  [
    { label: "LOW RISK",    val: s.lowRisk,  color: C.green, bg: C.greenBg },
    { label: "MEDIUM RISK", val: s.medRisk,  color: C.amber, bg: C.amberBg },
    { label: "HIGH RISK",   val: s.highRisk, color: C.red,   bg: C.redBg },
  ].forEach(({ label, val, color, bg }, i) => {
    const cx = PAD + i * riskW;
    doc.roundedRect(cx, y, riskW - 6, 52, 6).fill(bg);
    doc.fill(color).fontSize(8).font("Helvetica").text(label, cx + 12, y + 10);
    doc.fill(color).fontSize(22).font("Helvetica-Bold").text(String(val), cx + 12, y + 22);
  });
  y += 68;

  // ── Attack Type Breakdown ─────────────────────────────────────────────────
  doc.rect(PAD, y, 3, 14).fill(C.brand);
  doc.fill(C.ink).fontSize(12).font("Helvetica-Bold").text("Attack Types Detected", PAD + 10, y + 1);
  y += 24;

  if (attackBreakdown.length === 0) {
    doc.fill(C.subtle).fontSize(10).font("Helvetica").text("No fraud attacks detected this month.", PAD, y);
    y += 20;
  } else {
    attackBreakdown.slice(0, 6).forEach(({ _id, count }) => {
      const label = (_id || "UNKNOWN").replace(/_/g, " ");
      const pct = s.blocked > 0 ? Math.round((count / s.blocked) * 100) : 0;
      const barW = Math.max(10, ((W - PAD * 2 - 130) * pct) / 100);

      doc.fill(C.muted).fontSize(9).font("Helvetica").text(label, PAD, y + 2, { width: 140 });
      doc.roundedRect(PAD + 148, y, barW, 12, 3).fill(C.brand);
      doc.fill(C.ink).fontSize(9).font("Helvetica-Bold")
        .text(`${count}  (${pct}%)`, PAD + 148 + barW + 6, y + 1);
      y += 22;
    });
  }
  y += 12;

  // ── Top Blocked Transactions ──────────────────────────────────────────────
  doc.rect(PAD, y, 3, 14).fill(C.red);
  doc.fill(C.ink).fontSize(12).font("Helvetica-Bold").text("Top Blocked Transactions", PAD + 10, y + 1);
  y += 24;

  const colWidths = [160, 100, 80, 110];
  const headers   = ["Sender", "Account", "Amount", "Attack Type"];
  const headerX   = [PAD, PAD + 160, PAD + 260, PAD + 340];

  doc.rect(PAD, y, W - PAD * 2, 20).fill("#f1f5f9");
  headers.forEach((h, i) => {
    doc.fill(C.muted).fontSize(8).font("Helvetica-Bold").text(h, headerX[i], y + 6, { width: colWidths[i] });
  });
  y += 22;

  if (topAmounts.length === 0) {
    doc.fill(C.subtle).fontSize(9).font("Helvetica").text("No blocked transactions this month.", PAD, y);
    y += 20;
  } else {
    topAmounts.forEach((txn, i) => {
      if (i % 2 === 0) doc.rect(PAD, y, W - PAD * 2, 20).fill("#fafcff");
      doc.fill(C.ink).fontSize(9).font("Helvetica")
        .text(txn.sender?.name || "—", headerX[0], y + 5, { width: colWidths[0] - 10, lineBreak: false });
      doc.fill(C.muted).fontSize(8)
        .text(txn.sender?.accountNumber || "—", headerX[1], y + 5, { lineBreak: false });
      doc.fill(C.red).fontSize(9).font("Helvetica-Bold")
        .text(`Rs.${Number(txn.amount).toLocaleString("en-IN")}`, headerX[2], y + 5, { lineBreak: false });
      doc.fill(C.ink).fontSize(8).font("Helvetica")
        .text((txn.attackType || "UNKNOWN").replace(/_/g, " "), headerX[3], y + 5, { lineBreak: false });
      y += 22;
    });
  }
  y += 12;

  // ── Footer ────────────────────────────────────────────────────────────────
  const H = doc.page.height;
  doc.rect(0, H - 44, W, 44).fill(C.ink);
  doc.fill(C.white).opacity(0.7).fontSize(8.5).font("Helvetica")
    .text("BankGuard — Confidential Monthly Fraud Intelligence Report", PAD, H - 28);
  doc.fill(C.white).opacity(0.4).fontSize(8).font("Helvetica")
    .text("Page 1 of 1", 0, H - 28, { align: "right", width: W - PAD });
  doc.opacity(1);
}

// ── GET /api/admin/reports/monthly ────────────────────────────────────────
exports.downloadMonthlyReport = async (req, res, next) => {
  try {
    const now   = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year  = parseInt(req.query.year)  || now.getFullYear();

    const doc = new PDFDocument({ margin: 0, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="bankguard-report-${year}-${String(month).padStart(2,"0")}.pdf"`);
    doc.pipe(res);

    await buildMonthlyReportPDF(doc, month, year);
    doc.end();

    logger.info(`[Report] Monthly fraud report generated for ${month}/${year}`);
  } catch (err) {
    logger.error(`[Report] Error: ${err.message}`);
    next(err);
  }
};

// ── Auto-generate (called by cron on 1st of month) ────────────────────────
exports.autoGenerateReport = async () => {
  const now   = new Date();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  const year  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const filePath = path.join(REPORTS_DIR, `report-${year}-${String(month).padStart(2,"0")}.pdf`);

  if (fs.existsSync(filePath)) {
    logger.info(`[Report] Report for ${month}/${year} already exists, skipping.`);
    return;
  }

  const doc = new PDFDocument({ margin: 0, size: "A4" });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  await buildMonthlyReportPDF(doc, month, year);
  doc.end();

  stream.on("finish", () => logger.info(`[Report] Auto-generated: ${filePath}`));
  stream.on("error",  (e) => logger.error(`[Report] Auto-gen error: ${e.message}`));
};
