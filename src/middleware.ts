import { NextRequest, NextResponse } from 'next/server'

// Routes ที่ต้องการ authentication
const protectedRoutes = ['/select', '/checkin']

// ตรวจสอบ JWT แบบง่าย (ไม่ใช้ jsonwebtoken เพราะ Edge runtime ไม่รองรับ)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ข้าม static files และ API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg')
  ) {
    return NextResponse.next()
  }

  // ตรวจสอบว่าเป็น protected route หรือไม่
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // ดึง session cookie
    const sessionCookie = request.cookies.get('session')

    if (!sessionCookie) {
      // ไม่มี cookie → redirect ไป login
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // ตรวจสอบ JWT (decode เท่านั้น ไม่ verify signature)
    const payload = decodeJwtPayload(sessionCookie.value)

    if (!payload) {
      // JWT ไม่ถูกต้อง → redirect ไป login
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('session')
      return response
    }

    // ตรวจสอบว่า token หมดอายุหรือไม่
    const now = Math.floor(Date.now() / 1000)
    const exp = typeof payload.exp === 'number' ? payload.exp : 0
    if (exp > 0 && exp < now) {
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('session')
      return response
    }
  }

  // ถ้าอยู่ที่หน้า login แล้วมี session ที่ถูกต้อง → redirect ไป select
  if (pathname === '/login') {
    const sessionCookie = request.cookies.get('session')
    if (sessionCookie) {
      const payload = decodeJwtPayload(sessionCookie.value)
      if (payload) {
        const now = Math.floor(Date.now() / 1000)
        const exp = typeof payload.exp === 'number' ? payload.exp : 0
        if (exp === 0 || exp >= now) {
          const selectUrl = new URL('/select', request.url)
          return NextResponse.redirect(selectUrl)
        }
      }
    }
  }

  // เพิ่ม security headers
  const response = NextResponse.next()

  // ป้องกัน clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // ป้องกัน MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  )

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
