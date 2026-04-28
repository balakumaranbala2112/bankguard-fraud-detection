import api from '@/shared/services/api'
import { ENDPOINTS } from '@/shared/constants'

export const transactionService = {
  sendMoney: (data) => api.post(ENDPOINTS.SEND_MONEY, data),
  confirmTransaction: (data) => api.post(`${ENDPOINTS.CONFIRM_TXN}/${data.transactionId}/confirm`, data),
  verifyOTP:  (data) => api.post(ENDPOINTS.VERIFY_OTP, data),
  verifyPayment: (data) => api.post(`${ENDPOINTS.VERIFY_PAYMENT}/${data.transactionId}/verify`, data),
  getHistory: (params) => api.get(ENDPOINTS.HISTORY, { params }),
  getAlerts:  (params) => api.get(ENDPOINTS.ALERTS,  { params }),
  getRecentRecipients: () => api.get(ENDPOINTS.RECENT_RECIPIENTS),
}
