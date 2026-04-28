import { create } from "zustand";
import api from "@/shared/services/api";
import { ENDPOINTS } from "@/shared/constants";

const getStored = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

export const useAuthStore = create((set, get) => ({
  user: getStored("fs_user"),
  token: localStorage.getItem("fs_token"),
  loading: false,
  error: null,

  // ── Register ──────────────────────────────────────
  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(ENDPOINTS.REGISTER, data);
      const { token, user } = res.data;
      localStorage.setItem("fs_token", token);
      localStorage.setItem("fs_user", JSON.stringify(user));
      localStorage.setItem("bg_last_phone", user.phone);
      set({ token, user, loading: false });
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || "Registration failed";
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  // ── Login ─────────────────────────────────────────
  login: async (phone, pin) => {
    const existing = localStorage.getItem("fs_token");
    if (existing) {
      localStorage.removeItem("fs_token");
      localStorage.removeItem("fs_user");
    }
    set({ loading: true, error: null });
    try {
      const res = await api.post(ENDPOINTS.LOGIN, { phone, pin });
      // FEATURE 10: 2FA — backend returns requires2FA instead of token on new device
      if (res.data.requires2FA) {
        set({ loading: false });
        return { success: true, requires2FA: true, userId: res.data.userId };
      }
      const { token, user } = res.data;
      localStorage.setItem("fs_token", token);
      localStorage.setItem("fs_user", JSON.stringify(user));
      localStorage.setItem("bg_last_phone", user.phone);
      set({ token, user, loading: false });
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || "Login failed";
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  // ── FEATURE 10: 2FA verify OTP then complete login ────────────
  verifyLoginOtp: async (userId, otp) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(ENDPOINTS.VERIFY_LOGIN_OTP, {
        userId,
        otp,
        userAgent: navigator.userAgent,
      });
      const { token, user } = res.data;
      localStorage.setItem("fs_token", token);
      localStorage.setItem("fs_user", JSON.stringify(user));
      localStorage.setItem("bg_last_phone", user.phone);
      set({ token, user, loading: false });
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || "OTP verification failed";
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  // ── Refresh profile ───────────────────────────────
  refreshProfile: async () => {
    try {
      const res = await api.get(ENDPOINTS.PROFILE);
      const user = res.data.user;
      localStorage.setItem("fs_user", JSON.stringify(user));
      set({ user });
    } catch {
      /* silent */
    }
  },

  // ── Logout ────────────────────────────────────────
  logout: () => {
    localStorage.removeItem("fs_token");
    localStorage.removeItem("fs_user");
    set({ user: null, token: null });
  },

  clearError: () => set({ error: null }),
}));
