'use client'

import { useEffect, useCallback, useRef } from 'react'

const IDLE_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

interface UseIdleTimerOptions {
  timeoutMs: number
  onTimeout: () => void
  enabled?: boolean
}

export function useIdleTimer({ timeoutMs, onTimeout, enabled = true }: UseIdleTimerOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    if (enabled) {
      timerRef.current = setTimeout(() => {
        onTimeoutRef.current()
      }, timeoutMs)
    }
  }, [timeoutMs, enabled])

  useEffect(() => {
    if (!enabled) return

    resetTimer()

    const handleActivity = () => {
      resetTimer()
    }

    for (const event of IDLE_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true })
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      for (const event of IDLE_EVENTS) {
        document.removeEventListener(event, handleActivity)
      }
    }
  }, [enabled, resetTimer])
}
