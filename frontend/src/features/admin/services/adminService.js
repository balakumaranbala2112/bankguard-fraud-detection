import api from "@/shared/services/api";
import { ENDPOINTS } from "@/shared/constants";

export const adminService = {
  getStats: () => api.get(ENDPOINTS.ADMIN_STATS),
  getUsers: () => api.get(ENDPOINTS.ADMIN_USERS),
  getTransactions: () => api.get(ENDPOINTS.ADMIN_TRANSACTIONS),
};
