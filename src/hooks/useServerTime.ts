import { useState, useEffect, useRef, useCallback } from 'react'
import { withBasePath } from '@/lib/config'

// =============================================================================
//  useServerTime — sync นาฬิกากับ server เพื่อป้องกัน client time manipulation
//
//  หลักการ (เหมือน NTP):
//   1. fetch /api/time ครั้งเดียว → คำนวณ offset = serverTime - clientTime
//      ปรับด้วย network latency ≈ round-trip / 2
//   2. tick ทุก 1 วินาทีโดยใช้ Date.now() + offset (ไม่ต้อง fetch ทุกวิ)
//   3. re-sync ทุก 60 วินาที ป้องกัน drift สะสม
//
//  หาก fetch ล้มเหลว → offset = 0 → ใช้ local clock เป็น fallback
//
//  Load:  1 req/page load + 1 req/60 วิ (≈ 60 req/ชม/user)
//         เทียบกับ polling 2 วิ = 1,800 req/ชม/user
// =============================================================================

const RESYNC_INTERVAL_MS = 60_000  // 60 วินาที

export function useServerTime(): Date | null {
  const [time, setTime] = useState<Date | null>(null)
  const offsetRef  = useRef<number>(0)
  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const resyncRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // useCallback เพื่อ stable reference — ป้องกัน re-render loop
  const syncWithServer = useCallback(async () => {
    try {
      const t0  = Date.now()
      const res = await fetch(withBasePath('/api/time'), {
        cache:   'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      const t1  = Date.now()

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data     = await res.json()
      const serverTs = data.timestamp as number
      const latency  = (t1 - t0) / 2

      // offset = server time ที่ปรับ latency แล้ว − client time ปัจจุบัน
      offsetRef.current = serverTs - t1 + latency
    } catch (err) {
      // ไม่ break UI — ใช้ offset เดิม (fallback local clock ถ้า offset = 0)
      console.warn('[useServerTime] sync failed, keeping current offset:', err)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const start = async () => {
      await syncWithServer()
      if (!mounted) return

      // tick ทันทีหลัง sync แล้วทุก 1 วิ (ไม่มี network)
      setTime(new Date(Date.now() + offsetRef.current))
      tickRef.current = setInterval(() => {
        setTime(new Date(Date.now() + offsetRef.current))
      }, 1_000)

      // re-sync ทุก 60 วิ ป้องกัน drift
      resyncRef.current = setInterval(syncWithServer, RESYNC_INTERVAL_MS)
    }

    start()

    return () => {
      mounted = false
      if (tickRef.current)   clearInterval(tickRef.current)
      if (resyncRef.current) clearInterval(resyncRef.current)
    }
  }, [syncWithServer])

  return time
}
