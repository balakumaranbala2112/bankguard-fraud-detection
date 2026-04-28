// src/shared/hooks/useSocket.js
// FEATURE 2: Real-time WebSocket connection using socket.io-client

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
  : "http://localhost:4000";

/**
 * useSocket(handlers?)
 *
 * handlers (optional):
 *   onNewTransaction: (txn) => void
 *   onFraudAlert:     (txn) => void
 *
 * Returns { socket, socketRef, connected }
 *   socket    — the live socket.io-client instance; use for .emit() / .on()
 *              NOTE: will be null on the very first render (async connect).
 *              React effects that need it should use socketRef.current directly.
 *   connected — boolean reflecting current connection state
 */
export default function useSocket({ onNewTransaction, onFraudAlert } = {}) {
  const socketRef             = useRef(null);
  const [connected, setConnected] = useState(false);
  const [, forceRender]       = useState(0); // triggers re-render once socket is set

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports:           ["websocket", "polling"],
      reconnectionDelay:    1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;
    forceRender((n) => n + 1); // expose socket to callers on next render

    socket.on("connect",    () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("new_transaction", (data) => onNewTransaction?.(data));
    socket.on("fraud_alert",     (data) => onFraudAlert?.(data));
    socket.on("connect_error",   ()     => { /* silent */ });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { socket: socketRef.current, socketRef, connected };
}
