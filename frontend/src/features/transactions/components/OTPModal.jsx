import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import Modal from '@/shared/components/Modal'

export default function OTPModal({ open, onClose, onVerify, phone, loading }) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputs = useRef([])

  useEffect(() => {
    if (open) {
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => inputs.current[0]?.focus(), 100)
    }
  }, [open])

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length === 6) {
      setOtp(paste.split(''))
      inputs.current[5]?.focus()
    }
  }

  const handleSubmit = () => {
    const code = otp.join('')
    if (code.length === 6) onVerify(code)
  }

  return (
    <Modal open={open} onClose={onClose} title="OTP Verification">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="#1e35f5" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-semibold text-surface-900 mb-1">Enter verification code</h3>
        <p className="text-sm text-gray-500 mb-6">
          A 6-digit OTP was sent to <span className="font-medium text-surface-900">{phone}</span>
        </p>

        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              type="text" inputMode="numeric" maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-lg font-bold rounded-xl border-2 border-primary-100 bg-surface-50 
                         focus:outline-none focus:border-primary-500 transition-colors"
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={otp.join('').length < 6 || loading}
          className="fs-btn-primary w-full py-3"
        >
          {loading ? 'Verifying…' : 'Verify & Send'}
        </button>

        <button onClick={onClose} className="mt-3 text-sm text-gray-500 hover:text-gray-700 w-full py-2">
          Cancel
        </button>
      </div>
    </Modal>
  )
}
