import api from "@/shared/services/api";
import { ENDPOINTS } from "@/shared/constants";

export const adminService = {
  // Existing
  getStats:        ()            => api.get(ENDPOINTS.ADMIN_STATS),
  getUsers:        ()            => api.get(ENDPOINTS.ADMIN_USERS),
  getTransactions: (params)      => api.get(ENDPOINTS.ADMIN_TRANSACTIONS, { params }),

  // F4: Model retrain
  retrainModel: () => api.post(ENDPOINTS.ADMIN_RETRAIN),

  // F5: Appeals management
  getAppeals:    (status) => api.get(ENDPOINTS.ADMIN_APPEALS, { params: status ? { status } : {} }),
  decideAppeal:  (id, body) => api.put(`${ENDPOINTS.ADMIN_APPEALS}/${id}`, body),

  // F9: Audit logs
  getAuditLogs: (params) => api.get(ENDPOINTS.ADMIN_AUDIT_LOGS, { params }),

  // F12: Fraud Heatmap
  getHeatmap: () => api.get('/admin/heatmap'),

  // F15: Attack Trends
  getTrends: () => api.get('/admin/trends'),

  // F??: Attack Simulation
  simulateAttack: (data) => api.post('/admin/simulate-attack', data),
};
