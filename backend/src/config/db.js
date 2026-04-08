const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("MongoDB connected successfully");
    console.log(`Host     : ${conn.connection.host}`);
    console.log(`Database : ${conn.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(error.message);

    process.exit(1);
  }
};

module.exports = connectDB;
