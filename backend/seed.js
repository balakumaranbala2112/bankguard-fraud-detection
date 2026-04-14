// seed.js — Create users with full transaction history for demo
// Run: node seed.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const User = require("./src/models/User");
const Transaction = require("./src/models/Transaction");
const logger = require("./src/utils/logger");

// --------------------------------------------------------
// Dummy users with pattern fields
// --------------------------------------------------------
const userData = [
  {
    name: "Balakumaran K",
    email: "bk@bankguard.com",
    password: "password123",
    phone: "+919597437868",
    usualLocation: "Madurai",
    usualAmountMin: 200,
    usualAmountMax: 800,
    usualHourStart: 9,
    usualHourEnd: 22,
    balance: 100000,
  },
  {
    name: "Mowriyan C",
    email: "mowriyan@bankguard.com",
    password: "password123",
    phone: "+919000000002",
    usualLocation: "Chennai",
    usualAmountMin: 100,
    usualAmountMax: 1500,
    usualHourStart: 8,
    usualHourEnd: 23,
    balance: 100000,
  },
  {
    name: "Tamil Selvi M",
    email: "tamilselvi@bankguard.com",
    password: "password123",
    phone: "+919000000003",
    usualLocation: "Coimbatore",
    usualAmountMin: 500,
    usualAmountMax: 2000,
    usualHourStart: 9,
    usualHourEnd: 21,
    balance: 100000,
  },
  {
    name: "Sangeetha S",
    email: "sangeetha@bankguard.com",
    password: "password123",
    phone: "+919000000004",
    usualLocation: "Trichy",
    usualAmountMin: 50,
    usualAmountMax: 500,
    usualHourStart: 10,
    usualHourEnd: 20,
    balance: 100000,
  },
  {
    name: "Demo User",
    email: "demo@BankGuard.com",
    password: "demo1234",
    phone: "+919000000005",
    usualLocation: "Chennai",
    usualAmountMin: 100,
    usualAmountMax: 1000,
    usualHourStart: 9,
    usualHourEnd: 22,
    balance: 100000,
  },
  {
    name: "Attacker",
    email: "attacker@bankguard.com",
    password: "attack123",
    phone: "+919000000006",
    usualLocation: "Unknown",
    usualAmountMin: 0,
    usualAmountMax: 999999,
    usualHourStart: 0,
    usualHourEnd: 23,
    balance: 50000,
  },
  {
    name: "Admin",
    email: "admin@bankguard.com",
    password: "admin123",
    phone: "+916369745139",
    usualLocation: "Chennai",
    usualAmountMin: 0,
    usualAmountMax: 999999,
    usualHourStart: 0,
    usualHourEnd: 23,
    balance: 0,
    role: "admin",
  },
  {
    name: "Virat Kohli",
    email: "virat@bankguard.com",
    password: "password123",
    phone: "+919000000007",
    usualLocation: "Delhi",
    usualAmountMin: 500,
    usualAmountMax: 5000,
    usualHourStart: 6,
    usualHourEnd: 22,
    balance: 150000,
  },
  {
    name: "Rohit Sharma",
    email: "rohit@bankguard.com",
    password: "password123",
    phone: "+919000000008",
    usualLocation: "Mumbai",
    usualAmountMin: 300,
    usualAmountMax: 4000,
    usualHourStart: 9,
    usualHourEnd: 23,
    balance: 120000,
  },
];

// --------------------------------------------------------
// Helper — build a past transaction object
// --------------------------------------------------------
const pastTx = (sender, receiver, amount, hour, location, daysAgo) => ({
  sender: sender._id,
  receiver: receiver._id,
  amount,
  location,
  transactionHour: hour,
  status: "APPROVED",
  riskLevel: "LOW",
  flag: "GREEN",
  attackType: "NONE",
  confidence: Math.floor(Math.random() * 15),
  isNewLocation: false,
  isNewBeneficiary: false,
  otpVerified: false,
  otpAttempts: 0,
  note: "Normal transaction",
  createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
});

// --------------------------------------------------------
// Main seed function
// --------------------------------------------------------
const seedDB = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected for seeding");

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    logger.info("Existing data cleared");

    // Create users
    const users = await User.create(userData);
    logger.info(`${users.length} users created`);

    const bala = users[0]; // Balakumaran
    const mow = users[1]; // Mowriyan
    const tamil = users[2]; // Tamil Selvi
    const sang = users[3]; // Sangeetha
    const demo = users[4]; // Demo User

    // ── BALAKUMARAN PATTERN ──────────────────────────
    // Normal: Rs 200-800, Madurai, 9AM-10PM
    // Sends to: Mowriyan and Tamil Selvi only
    // Average amount: ~490
    // → Rs 95,000 attack = 193x average = INSTANT BLOCK
    const balaKnown = [mow.accountNumber, tamil.accountNumber];

    const balaTxns = [
      pastTx(bala, mow, 500, 14, "Madurai", 1),
      pastTx(bala, mow, 300, 10, "Madurai", 2),
      pastTx(bala, tamil, 750, 18, "Madurai", 3),
      pastTx(bala, mow, 200, 9, "Madurai", 4),
      pastTx(bala, tamil, 600, 16, "Madurai", 5),
      pastTx(bala, mow, 450, 11, "Madurai", 6),
      pastTx(bala, mow, 800, 20, "Madurai", 7),
      pastTx(bala, tamil, 350, 13, "Madurai", 8),
      pastTx(bala, mow, 550, 15, "Madurai", 9),
      pastTx(bala, tamil, 700, 17, "Madurai", 10),
      pastTx(bala, mow, 250, 10, "Madurai", 11),
      pastTx(bala, mow, 400, 14, "Madurai", 12),
      pastTx(bala, tamil, 650, 19, "Madurai", 13),
      pastTx(bala, mow, 300, 12, "Madurai", 14),
      pastTx(bala, mow, 500, 16, "Madurai", 15),
    ];

    // ── MOWRIYAN PATTERN ────────────────────────────
    // Normal: Rs 100-1500, Chennai, 8AM-11PM
    // Sends to: Bala and Sangeetha only
    // → Sending to Attacker = NEW BENEFICIARY FRAUD
    const mowKnown = [bala.accountNumber, sang.accountNumber];

    const mowTxns = [
      pastTx(mow, bala, 1000, 10, "Chennai", 1),
      pastTx(mow, sang, 500, 14, "Chennai", 2),
      pastTx(mow, bala, 1200, 11, "Chennai", 3),
      pastTx(mow, sang, 800, 16, "Chennai", 4),
      pastTx(mow, bala, 300, 18, "Chennai", 5),
      pastTx(mow, sang, 1500, 20, "Chennai", 6),
      pastTx(mow, bala, 600, 10, "Chennai", 7),
      pastTx(mow, sang, 900, 13, "Chennai", 8),
      pastTx(mow, bala, 1100, 15, "Chennai", 9),
      pastTx(mow, sang, 400, 19, "Chennai", 10),
      pastTx(mow, bala, 750, 12, "Chennai", 11),
      pastTx(mow, sang, 1300, 17, "Chennai", 12),
      pastTx(mow, bala, 550, 21, "Chennai", 13),
      pastTx(mow, sang, 700, 11, "Chennai", 14),
      pastTx(mow, bala, 1000, 14, "Chennai", 15),
    ];

    // ── TAMIL SELVI PATTERN ─────────────────────────
    // Normal: Rs 500-2000, Coimbatore, 9AM-9PM
    // Sends to: Bala and Mowriyan only
    // → Sending at 2AM = ODD HOUR FRAUD
    const tamilKnown = [bala.accountNumber, mow.accountNumber];

    const tamilTxns = [
      pastTx(tamil, bala, 1000, 10, "Coimbatore", 1),
      pastTx(tamil, mow, 1500, 14, "Coimbatore", 2),
      pastTx(tamil, bala, 800, 11, "Coimbatore", 3),
      pastTx(tamil, mow, 2000, 16, "Coimbatore", 4),
      pastTx(tamil, bala, 1200, 13, "Coimbatore", 5),
      pastTx(tamil, mow, 600, 15, "Coimbatore", 6),
      pastTx(tamil, bala, 1800, 10, "Coimbatore", 7),
      pastTx(tamil, mow, 900, 17, "Coimbatore", 8),
      pastTx(tamil, bala, 1400, 12, "Coimbatore", 9),
      pastTx(tamil, mow, 500, 14, "Coimbatore", 10),
      pastTx(tamil, bala, 1600, 11, "Coimbatore", 11),
      pastTx(tamil, mow, 1100, 16, "Coimbatore", 12),
      pastTx(tamil, bala, 700, 13, "Coimbatore", 13),
      pastTx(tamil, mow, 1300, 15, "Coimbatore", 14),
      pastTx(tamil, bala, 1700, 10, "Coimbatore", 15),
    ];

    // ── SANGEETHA PATTERN ───────────────────────────
    // Normal: Rs 50-500, Trichy, 10AM-8PM
    // Maximum 1 txn per day — small frequent amounts
    // → 5 txns in 2 mins = VELOCITY ATTACK
    const sangKnown = [bala.accountNumber, tamil.accountNumber];

    const sangTxns = [
      pastTx(sang, bala, 200, 11, "Trichy", 1),
      pastTx(sang, tamil, 300, 13, "Trichy", 2),
      pastTx(sang, bala, 100, 15, "Trichy", 3),
      pastTx(sang, tamil, 500, 12, "Trichy", 4),
      pastTx(sang, bala, 150, 14, "Trichy", 5),
      pastTx(sang, tamil, 400, 16, "Trichy", 6),
      pastTx(sang, bala, 250, 11, "Trichy", 7),
      pastTx(sang, tamil, 50, 13, "Trichy", 8),
      pastTx(sang, bala, 350, 15, "Trichy", 9),
      pastTx(sang, tamil, 450, 12, "Trichy", 10),
      pastTx(sang, bala, 100, 14, "Trichy", 11),
      pastTx(sang, tamil, 300, 16, "Trichy", 12),
      pastTx(sang, bala, 200, 11, "Trichy", 13),
      pastTx(sang, tamil, 500, 13, "Trichy", 14),
      pastTx(sang, bala, 150, 15, "Trichy", 15),
    ];

    // ── DEMO USER PATTERN ───────────────────────────
    // Normal: Rs 100-1000, Chennai, 9AM-10PM
    const demoKnown = [bala.accountNumber, mow.accountNumber];

    const demoTxns = [
      pastTx(demo, bala, 500, 10, "Chennai", 1),
      pastTx(demo, mow, 800, 14, "Chennai", 2),
      pastTx(demo, bala, 300, 11, "Chennai", 3),
      pastTx(demo, mow, 1000, 16, "Chennai", 4),
      pastTx(demo, bala, 600, 13, "Chennai", 5),
      pastTx(demo, mow, 400, 15, "Chennai", 6),
      pastTx(demo, bala, 700, 10, "Chennai", 7),
      pastTx(demo, mow, 900, 17, "Chennai", 8),
      pastTx(demo, bala, 200, 12, "Chennai", 9),
      pastTx(demo, mow, 750, 14, "Chennai", 10),
    ];

    // ── INSERT ALL TRANSACTIONS ──────────────────────
    const allTxns = [
      ...balaTxns,
      ...mowTxns,
      ...tamilTxns,
      ...sangTxns,
      ...demoTxns,
    ];

    await Transaction.insertMany(allTxns);
    logger.info(`${allTxns.length} transactions created`);

    // ── UPDATE KNOWN BENEFICIARIES ───────────────────
    await User.findByIdAndUpdate(bala._id, { knownBeneficiaries: balaKnown });
    await User.findByIdAndUpdate(mow._id, { knownBeneficiaries: mowKnown });
    await User.findByIdAndUpdate(tamil._id, { knownBeneficiaries: tamilKnown });
    await User.findByIdAndUpdate(sang._id, { knownBeneficiaries: sangKnown });
    await User.findByIdAndUpdate(demo._id, { knownBeneficiaries: demoKnown });
    logger.info("Known beneficiaries updated");

    // ── PRINT SUMMARY ────────────────────────────────
    logger.info("");
    logger.info("===== SEED COMPLETE =====");
    logger.info("");
    logger.info("Users created:");
    logger.info(
      `  Balakumaran  | bk@bankguard.com          | ${bala.accountNumber}  | Rs 100,000`,
    );
    logger.info(
      `  Mowriyan     | mowriyan@bankguard.com    | ${mow.accountNumber}  | Rs 100,000`,
    );
    logger.info(
      `  Tamil Selvi  | tamilselvi@bankguard.com  | ${tamil.accountNumber}  | Rs 100,000`,
    );
    logger.info(
      `  Sangeetha    | sangeetha@bankguard.com   | ${sang.accountNumber}  | Rs 100,000`,
    );
    logger.info(
      `  Demo User    | demo@BankGuard.com      | ${demo.accountNumber}  | Rs 100,000`,
    );
    logger.info(
      `  Attacker     | attacker@bankguard.com    | ${users[5].accountNumber}  | Rs 50,000`,
    );
    logger.info(
      `  Admin        | admin@bankguard.com       | ${users[6].accountNumber}  | Admin`,
    );
    logger.info("");
    logger.info("Demo login:");
    logger.info("  Email    : demo@BankGuard.com");
    logger.info("  Password : demo1234");
    logger.info("");
    logger.info("Fraud demo scripts:");
    logger.info(
      "  BLOCK  — Login as bk@bankguard.com, send Rs 95,000 to any account",
    );
    logger.info(
      "  OTP    — Login as bk@bankguard.com, send Rs 4,500 to new account",
    );
    logger.info(
      "  APPROVE — Login as bk@bankguard.com, send Rs 500 to Mowriyan account",
    );
    logger.info("");
    logger.info(
      "All passwords: password123 (except demo: demo1234, admin: admin123)",
    );
    logger.info("=========================");

    process.exit(0);
  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

seedDB();
