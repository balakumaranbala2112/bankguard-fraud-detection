const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Fix 19: rely on mongoose.connection.readyState (1 = connected) instead of a
    // module-level boolean that can become stale after a disconnect/reconnect cycle.
    if (mongoose.connection.readyState === 1) {
      console.log("Using existing MongoDB connection");
      return;
    }

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("MongoDB connected");
    console.log(`Host     : ${conn.connection.host}`);
    console.log(`Database : ${conn.connection.name}`);

    // Runtime monitoring
    mongoose.connection.on("disconnected", () => {
      console.error("MongoDB disconnected!");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB error:", err.message);
    });

  } catch (error) {
    console.error("DB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDB;