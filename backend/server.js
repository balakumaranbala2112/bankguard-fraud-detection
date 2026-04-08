require("dotenv").config();

const connectDB = require("./src/config/db");
const app = require("./app");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect DB first
    await connectDB();

    app.listen(PORT, () => {
      console.log("BankGuard backend running");
      console.log(`Port         : ${PORT}`);
      console.log(`API Base     : http://localhost:${PORT}/api`);
      console.log(`Auth         : http://localhost:${PORT}/api/auth`);
      console.log(`Transactions : http://localhost:${PORT}/api/transactions`);
      console.log(`Alerts       : http://localhost:${PORT}/api/alerts`);
      console.log(`Admin        : http://localhost:${PORT}/api/admin`);
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
