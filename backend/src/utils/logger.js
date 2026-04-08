// src/utils/logger.js

const winston = require("winston");

const logger = winston.createLogger({
  level: "info",

  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),

  transports: [
    // Print to console
    new winston.transports.Console(),

    // Save all logs to file
    new winston.transports.File({
      filename: "logs/app.log",
      level: "info",
    }),

    // Save only errors to separate file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
  ],
});

module.exports = logger;
