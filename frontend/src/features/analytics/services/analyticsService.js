import api from "@/shared/services/api";

export const analyticsService = {
  getSpending: () => api.get('/analytics/spending'),
};
