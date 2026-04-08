import { useState, useCallback } from 'react'
import { transactionService } from '../services/transactionService'

export const useTransactions = () => {
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })

  const fetchHistory = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const res = await transactionService.getHistory(params)
      setHistory(res.data.transactions || [])
      if (res.data.pagination) setPagination(res.data.pagination)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  return { history, loading, error, pagination, fetchHistory }
}
