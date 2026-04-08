import axios from "axios";
import { API_BASE } from "../constants";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("fs_token");
      localStorage.removeItem("fs_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

window.addEventListener("storage", (e) => {
  if (e.key === "fs_token") {
    if (!e.newValue) {
      // Token removed in another tab → force logout
      window.location.href = "/login";
    } else {
      // Token changed in another tab → reload to sync
      window.location.reload();
    }
  }
});

export default api;
