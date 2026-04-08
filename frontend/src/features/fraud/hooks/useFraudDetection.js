import { useState } from 'react'
import { transactionService } from '@/features/transactions/services/transactionService'

export const useFraudDetection = () => {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const analyse = async (payload) => {
    setLoading(true)
    setError(null)
    try {
      const res = await transactionService.sendMoney(payload)
      setResult(res.data)
      return { success: true, data: res.data }
    } catch (err) {
      const msg = err.response?.data?.error || 'Analysis failed'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setResult(null); setError(null) }

  return { result, loading, error, analyse, reset }
}
