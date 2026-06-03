import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware } from '@/lib/rate-limit'

// force-dynamic: ห้าม Next.js cache route นี้เป็น static
// ถ้าไม่มี → x-nextjs-cache: HIT → timestamp แช่แข็งที่ build time
export const dynamic = 'force-dynamic'

// GET /api/time
// คืนเวลาปัจจุบันของ server สำหรับ client sync offset
// ป้องกัน user แก้นาฬิกา client มาโกงเวลาในระบบ attendance
//
// Rate limit: 20 req/นาที/IP
// useServerTime hook: 1 req/page load + re-sync ทุก 60 วิ → ~60 req/ชม/user
export async function GET(request: NextRequest) {
  // Rate limit — ป้องกัน polling ถี่หรือ abuse
  const limited = rateLimitMiddleware(request, 20, 60_000)
  if (limited) return limited

  return NextResponse.json(
    {
      timestamp: Date.now(),         // Unix ms — ใช้คำนวณ offset
      iso: new Date().toISOString(), // UTC ISO — สำรองสำหรับ debug
      // ไม่ส่ง tz — server config ไม่ควรเปิดเผยให้ client
    },
    {
      headers: {
        // ห้าม cache ทุก layer (Next.js, nginx, browser, CDN)
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma':        'no-cache',
      },
    }
  )
}
