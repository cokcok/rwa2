import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Base URL สำหรับ redirect (prog1-test เป็น intranet)
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://prog1-test.raot.co.th'
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-this'

// Routes ที่ต้องการ authentication
const protectedRoutes = ['/select', '/checkin']

export async function middleware(request: NextRequest) {
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
      return NextResponse.redirect(`${APP_BASE_URL}${BASE_PATH}/login`)
    }

    // มี cookie → ตรวจสอบ JWT signature ด้วย jose (Edge-compatible)
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload } = await jwtVerify(sessionCookie.value, secret, {
        algorithms: ['HS256']
      })

      // ตรวจสอบ exp
      const exp = typeof payload.exp === 'number' ? payload.exp : 0
      const now = Math.floor(Date.now() / 1000)
      if (exp > 0 && exp < now) {
        const response = NextResponse.redirect(`${APP_BASE_URL}${BASE_PATH}/login`)
        response.cookies.set('session', '', { maxAge: 0, path: '/' })
        return response
      }

      // ตรวจสอบ iat - ถ้า token ออกมานานเกิน 30 นาที ให้ login ใหม่
      const iat = typeof payload.iat === 'number' ? payload.iat : 0
      if (iat > 0 && (now - iat) > 30 * 60) {
        const response = NextResponse.redirect(`${APP_BASE_URL}${BASE_PATH}/login`)
        response.cookies.set('session', '', { maxAge: 0, path: '/' })
        return response
      }
    } catch {
      // verify ไม่ผิด → ลบ cookie แล้ว redirect
      const response = NextResponse.redirect(`${APP_BASE_URL}${BASE_PATH}/login`)
      response.cookies.set('session', '', { maxAge: 0, path: '/' })
      return response
    }
  }

  // หน้า login: ลบ cookie เก่าเสมอ บังคับ login ใหม่ทุกครั้ง
  if (pathname === '/login' || pathname.endsWith('/login')) {
    const sessionCookie = request.cookies.get('session')
    if (sessionCookie) {
      const response = NextResponse.next()
      response.cookies.set('session', '', { maxAge: 0, path: '/' })
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
