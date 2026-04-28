// src/utils/socketInstance.js
// Singleton socket.io instance — shared across controllers

let io = null;

module.exports = {
  init(server) {
    const { Server } = require("socket.io");
    io = new Server(server, {
      cors: {
        origin: [process.env.CLIENT_URL, "http://localhost:3000"].filter(Boolean),
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      const clientId = socket.id;
      console.log(`[Socket.io] Client connected: ${clientId}`);

      socket.on("join_admin", () => {
        socket.join("admin_room");
        console.log(`[Socket.io] Client ${clientId} joined admin_room`);
      });

      socket.on("disconnect", () => {
        console.log(`[Socket.io] Client disconnected: ${clientId}`);
      });
    });

    return io;
  },

  getIO() {
    if (!io) {
      throw new Error("Socket.io not initialized — call init(server) first");
    }
    return io;
  },

  // Safe emit — won't throw if io not ready
  emit(event, data) {
    if (io) {
      io.emit(event, data);
    }
  },

  // Emit only to admin room
  emitToAdmin(event, data) {
    if (io) {
      io.to("admin_room").emit(event, data);
    }
  },
};
