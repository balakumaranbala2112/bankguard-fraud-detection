import { useState, useCallback } from 'react'
import api from '@/shared/services/api'
import { ENDPOINTS } from '@/shared/constants'

export const useAlerts = () => {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetchAlerts = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(ENDPOINTS.ALERTS, { params })
      setAlerts(res.data.alerts || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [])

  return { alerts, loading, error, fetchAlerts }
}
