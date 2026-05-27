import { NextRequest, NextResponse } from 'next/server'
import { ThaIDAuthProvider } from '@/lib/auth-provider'
import { signToken, createJwtCookie } from '@/lib/jwt'

// GET /api/auth/thaid-callback
// รับ callback จาก ThaID หลัง authenticate สำเร็จ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // ตรวจสอบ error จาก ThaID
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'เกิดข้อผิดพลาด'
      console.error('ThaID error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription)}`, request.url)
      )
    }

    // ตรวจสอบ code
    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=Missing+authorization+code', request.url)
      )
    }

    // ตรวจสอบ state (CSRF protection)
    const stateCookie = request.cookies.get('thaid_state')
    if (!state || !stateCookie || state !== stateCookie.value) {
      console.error('ThaID state mismatch:', { received: state, expected: stateCookie?.value })
      return NextResponse.redirect(
        new URL('/login?error=Invalid+session+state', request.url)
      )
    }

    // แลก code เป็นข้อมูลผู้ใช้
    const authProvider = new ThaIDAuthProvider()

    let userProfile
    try {
      userProfile = await authProvider.handleCallback(code)
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'NOT_FOUND':
            return NextResponse.redirect(
              new URL('/login?error=ไม่พบข้อมูลในระบบ+HR', request.url)
            )
          case 'TOKEN_EXCHANGE_FAILED':
          case 'NO_ACCESS_TOKEN':
            return NextResponse.redirect(
              new URL('/login?error=การยืนยันตัวตนล้มเหลว', request.url)
            )
          case 'USERINFO_FAILED':
          case 'NO_PID':
            return NextResponse.redirect(
              new URL('/login?error=ไม่สามารถดึงข้อมูลผู้ใช้ได้', request.url)
            )
        }
      }
      throw error
    }

    // สร้าง JWT token
    const token = signToken(userProfile)

    // สร้าง response redirect ไปหน้า /select พร้อม set cookie
    const response = NextResponse.redirect(new URL('/select', request.url))
    response.headers.set('Set-Cookie', createJwtCookie(token))

    // ลบ state cookie (ใช้ครั้งเดียว)
    response.cookies.delete('thaid_state')

    return response
  } catch (error) {
    console.error('ThaID callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=เกิดข้อผิดพลาดในระบบ', request.url)
    )
  }
}
