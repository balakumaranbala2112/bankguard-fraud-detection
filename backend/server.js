require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");
const cron = require("node-cron");
const connectDB = require("./src/config/db");
const app = require("./app");
const socketIO = require("./src/utils/socketInstance");
const reportController = require("./src/controllers/reportController");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    // Connect DB first
    await connectDB();

    // FEATURE 13: Schedule monthly fraud report (1st of every month at 00:05)
    cron.schedule("5 0 1 * *", () => {
      console.log("[Cron] Generating monthly fraud report…");
      reportController.autoGenerateReport().catch((e) =>
        console.error("[Cron] Report error:", e.message)
      );
    });
    console.log("[Cron] Monthly report scheduler registered");

    // Wrap express app in HTTP server for socket.io
    const server = http.createServer(app);

    // FEATURE 2: Attach socket.io
    socketIO.init(server);

    server.listen(PORT, () => {
      console.log("BankGuard backend running");
      console.log(`Port         : ${PORT}`);
      console.log(`API Base     : http://localhost:${PORT}/api/v1`);
      console.log(`Auth         : http://localhost:${PORT}/api/v1/auth`);
      console.log(`Transactions : http://localhost:${PORT}/api/v1/transactions`);
      console.log(`Alerts       : http://localhost:${PORT}/api/v1/alerts`);
      console.log(`Admin        : http://localhost:${PORT}/api/v1/admin`);
      console.log(`WebSocket    : ws://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      try {
        server.close(() => console.log("HTTP server closed"));
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
        process.exit(0);
      } catch (err) {
        console.error("Shutdown error:", err.message);
        process.exit(1);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
