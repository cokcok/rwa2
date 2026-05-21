import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limiter (สำหรับ dev)
// Production ควรใช้ Redis store
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// ทำความสะอาด expired entries ทุก 1 นาที
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, entry] of entries) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000)

// ดึง IP address จาก request
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

// ตรวจสอบ rate limit
export function checkRateLimit(
  request: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const ip = getClientIp(request)
  const endpoint = request.nextUrl.pathname
  const key = `${ip}:${endpoint}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // สร้าง entry ใหม่หรือ reset
    entry = {
      count: 1,
      resetTime: now + windowMs
    }
    rateLimitStore.set(key, entry)
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: entry.resetTime
    }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

// Rate limit middleware สำหรับ API routes
export function rateLimitMiddleware(
  request: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60000
): NextResponse | null {
  const result = checkRateLimit(request, maxRequests, windowMs)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: 'RATE_LIMITED',
        message: `คำขอมากเกินไป กรุณารอ ${retryAfter} วินาที`
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
        }
      }
    )
  }

  return null // อนุญาตให้ดำเนินการต่อ
}
