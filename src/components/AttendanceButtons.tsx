'use client'

import { useState } from 'react'

interface AttendanceButtonsProps {
  onCheckin: (actionType: 'IN' | 'OUT') => Promise<void>
  disabled?: boolean
}

export default function AttendanceButtons({ onCheckin, disabled }: AttendanceButtonsProps) {
  const [loading, setLoading] = useState<'IN' | 'OUT' | null>(null)

  const handleClick = async (actionType: 'IN' | 'OUT') => {
    setLoading(actionType)
    try {
      await onCheckin(actionType)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <button
        onClick={() => handleClick('IN')}
        disabled={disabled || loading !== null}
        className="flex-1 btn-success flex items-center justify-center gap-2 py-4 text-lg"
      >
        {loading === 'IN' ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
        )}
        <span>{loading === 'IN' ? 'กำลังลงเวลา...' : 'เข้างาน'}</span>
      </button>

      <button
        onClick={() => handleClick('OUT')}
        disabled={disabled || loading !== null}
        className="flex-1 btn-danger flex items-center justify-center gap-2 py-4 text-lg"
      >
        {loading === 'OUT' ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        )}
        <span>{loading === 'OUT' ? 'กำลังลงเวลา...' : 'ออกงาน'}</span>
      </button>
    </div>
  )
}
