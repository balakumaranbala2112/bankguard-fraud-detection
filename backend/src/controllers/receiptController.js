// src/controllers/receiptController.js
// FEATURE 8: Transaction Receipt PDF

const PDFDocument = require("pdfkit");
const Transaction = require("../models/Transaction");
const logger = require("../utils/logger");

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  brand: "#1e35f5",
  brandDark: "#1228c2",
  brandMid: "#3b52f7",
  ink: "#0f172a",
  muted: "#64748b",
  subtle: "#94a3b8",
  border: "#e2e8f0",
  surface: "#f8fafc",
  white: "#ffffff",
  green: "#16a34a",
  greenBg: "#dcfce7",
  red: "#dc2626",
  redBg: "#fee2e2",
  amber: "#d97706",
  amberBg: "#fef3c7",
  slate: "#475569",
  slateBg: "#f1f5f9",
};

// ── Helpers ────────────────────────────────────────────────────────────────
const statusStyle = (status) => {
  const map = {
    APPROVED: { fill: C.greenBg, text: C.green, label: "Approved" },
    BLOCKED: { fill: C.redBg, text: C.red, label: "Blocked" },
    OTP_PENDING: { fill: C.amberBg, text: C.amber, label: "OTP Pending" },
  };
  return map[status] || { fill: C.slateBg, text: C.slate, label: status };
};

const riskStyle = (level) => {
  const map = {
    LOW: { fill: C.greenBg, text: C.green },
    MEDIUM: { fill: C.amberBg, text: C.amber },
    HIGH: { fill: C.redBg, text: C.red },
  };
  return map[level] || { fill: C.slateBg, text: C.slate };
};

// ── GET /api/transactions/:id/receipt ─────────────────────────────────────
exports.downloadReceipt = async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate("sender", "name email accountNumber")
      .populate("receiver", "name email accountNumber")
      .lean();

    if (!txn) {
      return res.status(404).json({ success: false, error: "Transaction not found" });
    }

    // Ensure user owns this transaction
    const uid = req.user._id.toString();
    const senderId = txn.sender?._id?.toString() || txn.sender?.toString();
    const receiverId = txn.receiver?._id?.toString() || txn.receiver?.toString();

    if (uid !== senderId && uid !== receiverId && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    // ── PDF Setup ──────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 0, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${txn._id}.pdf"`,
    );
    doc.pipe(res);

    const W = doc.page.width;   // 595
    const H = doc.page.height;  // 842
    const PAD = 48;

    // ── 1. Header ──────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 100).fill(C.brandDark);

    // Decorative accent circle (top-right)
    doc.save();
    doc.circle(W + 10, -30, 110).fill(C.brandMid).opacity(0.4);
    doc.restore();

    // Brand name
    doc.fill(C.white)
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("BankGuard", PAD, 30);

    doc.fill(C.white)
      .opacity(0.65)
      .fontSize(9)
      .font("Helvetica")
      .text("Intelligent Fraud Detection Platform", PAD, 55);
    doc.opacity(1);

    // Receipt label — right aligned
    doc.fill(C.white)
      .opacity(0.9)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("TRANSACTION RECEIPT", 0, 32, { align: "right", width: W - PAD });

    doc.fill(C.white)
      .opacity(0.55)
      .fontSize(9)
      .font("Helvetica")
      .text(
        `Ref: #${txn._id.toString().slice(-10).toUpperCase()}`,
        0, 52,
        { align: "right", width: W - PAD },
      );
    doc.opacity(1);

    // ── 2. Amount Hero Card ────────────────────────────────────────────────
    const cardX = PAD;
    const cardY = 118;
    const cardW = W - PAD * 2;
    const cardH = 82;

    // Subtle drop shadow
    doc.save();
    doc.rect(cardX + 2, cardY + 3, cardW, cardH).fill("#cbd5e1").opacity(0.4);
    doc.restore();

    // Card body
    doc.roundedRect(cardX, cardY, cardW, cardH, 8).fill(C.white);

    // Left accent strip
    doc.roundedRect(cardX, cardY, 5, cardH, 3).fill(C.brand);

    // Amount label
    doc.fill(C.muted)
      .fontSize(9)
      .font("Helvetica")
      .text("TRANSACTION AMOUNT", cardX + 20, cardY + 16);

    // Amount value
    const amtStr = `Rs. ${Number(txn.amount).toLocaleString("en-IN")}`;
    doc.fill(C.ink)
      .fontSize(28)
      .font("Helvetica-Bold")
      .text(amtStr, cardX + 20, cardY + 31);

    // Status badge — right side of card
    const st = statusStyle(txn.status);
    const badgeW = 104;
    const badgeH = 28;
    const badgeX = cardX + cardW - badgeW - 18;
    const badgeY = cardY + (cardH - badgeH) / 2;

    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 14).fill(st.fill);
    doc.fill(st.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(st.label, badgeX, badgeY + 9, { width: badgeW, align: "center" });

    // ── Shared layout constants ────────────────────────────────────────────
    let y = cardY + cardH + 28;
    const colL = PAD;
    const colR = W / 2 + 6;
    const colW = W / 2 - PAD - 6;

    // ── Helper: section heading with left accent bar ───────────────────────
    const sectionHeader = (title) => {
      doc.rect(PAD, y, 3, 15).fill(C.brand);
      doc.fill(C.ink)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(title, PAD + 11, y + 1);
      y += 26;
    };

    // ── Helper: small info cell (half-width) ──────────────────────────────
    const cell = (label, value, cx, cy, accentValue = false) => {
      doc.roundedRect(cx, cy, colW, 50, 6).fill(C.surface);
      doc.fill(C.subtle)
        .fontSize(8)
        .font("Helvetica")
        .text(label.toUpperCase(), cx + 12, cy + 10, { width: colW - 24 });
      doc.fill(accentValue ? C.brand : C.ink)
        .fontSize(11)
        .font(accentValue ? "Helvetica-Bold" : "Helvetica")
        .text(value || "—", cx + 12, cy + 25, { width: colW - 24, lineBreak: false });
    };

    // ── Helper: full-width info cell ──────────────────────────────────────
    const cellFull = (label, value) => {
      const fw = W - PAD * 2;
      doc.roundedRect(PAD, y, fw, 50, 6).fill(C.surface);
      doc.fill(C.subtle)
        .fontSize(8)
        .font("Helvetica")
        .text(label.toUpperCase(), PAD + 12, y + 10);
      doc.fill(C.ink)
        .fontSize(11)
        .font("Helvetica")
        .text(value || "—", PAD + 12, y + 25, { width: fw - 24 });
      y += 62;
    };

    // ── 3. Transaction Details ─────────────────────────────────────────────
    sectionHeader("Transaction Details");

    const date = new Date(txn.createdAt).toLocaleString("en-IN", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });

    cell("Transaction ID", txn._id.toString(), colL, y);
    cell("Date & Time", date, colR, y);
    y += 62;

    // ── 4. Parties ─────────────────────────────────────────────────────────
    sectionHeader("Parties Involved");

    const senderName = txn.sender?.name || "—";
    const senderSub = txn.sender?.accountNumber
      ? `Account: ${txn.sender.accountNumber}`
      : txn.sender?.email || "";

    const receiverName = txn.receiver?.name || "—";
    const receiverSub = txn.receiver?.accountNumber
      ? `Account: ${txn.receiver.accountNumber}`
      : txn.receiver?.email || "";

    // Sender card
    doc.roundedRect(colL, y, colW, 64, 6).fill(C.surface);
    doc.roundedRect(colL, y, colW, 4, 3).fill("#818cf8"); // indigo top bar
    doc.fill(C.subtle).fontSize(8).font("Helvetica")
      .text("FROM  ·  SENDER", colL + 12, y + 14);
    doc.fill(C.ink).fontSize(12).font("Helvetica-Bold")
      .text(senderName, colL + 12, y + 28, { width: colW - 24, lineBreak: false });
    doc.fill(C.muted).fontSize(9).font("Helvetica")
      .text(senderSub, colL + 12, y + 46, { width: colW - 24, lineBreak: false });

    // Receiver card
    doc.roundedRect(colR, y, colW, 64, 6).fill(C.surface);
    doc.roundedRect(colR, y, colW, 4, 3).fill(C.brand); // brand top bar
    doc.fill(C.subtle).fontSize(8).font("Helvetica")
      .text("TO  ·  RECEIVER", colR + 12, y + 14);
    doc.fill(C.ink).fontSize(12).font("Helvetica-Bold")
      .text(receiverName, colR + 12, y + 28, { width: colW - 24, lineBreak: false });
    doc.fill(C.muted).fontSize(9).font("Helvetica")
      .text(receiverSub, colR + 12, y + 46, { width: colW - 24, lineBreak: false });

    y += 76;

    // ── 5. Risk Assessment ─────────────────────────────────────────────────
    sectionHeader("Risk Assessment");

    const rl = (txn.riskLevel || "LOW").toUpperCase();
    const rs = riskStyle(rl);

    // Risk level cell with colored indicator dot
    doc.roundedRect(colL, y, colW, 50, 6).fill(C.surface);
    doc.circle(colL + 22, y + 25, 7).fill(rs.fill);
    doc.circle(colL + 22, y + 25, 4).fill(rs.text);
    doc.fill(C.subtle).fontSize(8).font("Helvetica")
      .text("RISK LEVEL", colL + 38, y + 10);
    doc.fill(rs.text).fontSize(13).font("Helvetica-Bold")
      .text(rl, colL + 38, y + 25);

    // Detection type cell
    const detection = txn.attackType && txn.attackType !== "NONE"
      ? txn.attackType.replace(/_/g, " ")
      : "None Detected";

    cell("Detection Type", detection, colR, y);
    y += 62;

    // ── 6. Note (optional) ─────────────────────────────────────────────────
    if (txn.note) {
      sectionHeader("Remarks");
      cellFull("Note", txn.note);
    }

    // ── 7. Thin divider ────────────────────────────────────────────────────
    doc.moveTo(PAD, y + 8)
      .lineTo(W - PAD, y + 8)
      .strokeColor(C.border)
      .lineWidth(0.75)
      .stroke();

    // ── 8. Footer ──────────────────────────────────────────────────────────
    const footerY = H - 54;
    doc.rect(0, footerY, W, 54).fill(C.ink);

    doc.fill(C.white)
      .opacity(0.85)
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .text("BankGuard — Intelligent Fraud Detection Platform", PAD, footerY + 13);

    const genTime = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    doc.fill(C.subtle)
      .opacity(0.7)
      .fontSize(8.5)
      .font("Helvetica")
      .text(
        `Generated on ${genTime} IST  ·  This is a system-generated receipt`,
        PAD, footerY + 30,
      );
    doc.opacity(1);

    // Page number — right side of footer
    doc.fill(C.white)
      .opacity(0.4)
      .fontSize(9)
      .font("Helvetica")
      .text("Page 1 of 1", 0, footerY + 20, { align: "right", width: W - PAD });
    doc.opacity(1);

    doc.end();

    logger.info(`[Receipt] PDF generated for transaction ${txn._id}`);
  } catch (error) {
    logger.error(`[Receipt] Generate error: ${error.message}`);
    next(error);
  }
};