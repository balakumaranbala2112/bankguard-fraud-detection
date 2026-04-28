// src/shared/hooks/usePushNotifications.js
// FEATURE 7: Web Push Notifications

import { useCallback } from "react";
import { API_BASE, ENDPOINTS } from "@/shared/constants";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const subscribe = useCallback(async (token) => {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        console.info("[Push] Not supported in this browser");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.info("[Push] Permission denied");
        return;
      }

      // Wait for SW registration
      const registration = await navigator.serviceWorker.ready;

      if (!VAPID_PUBLIC_KEY) {
        console.info("[Push] VITE_VAPID_PUBLIC_KEY not set — skipping subscription");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to backend
      await fetch(`${API_BASE}${ENDPOINTS.PUSH_SUBSCRIBE}`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription }),
      });

      console.info("[Push] Subscription saved");
    } catch (err) {
      console.info("[Push] Subscribe failed:", err.message);
    }
  }, []);

  return { subscribe };
}
