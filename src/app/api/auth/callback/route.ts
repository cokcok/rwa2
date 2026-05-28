import { NextRequest, NextResponse } from 'next/server'
import { ThaIDAuthProvider } from '@/lib/auth-provider'
import { signToken, createJwtCookie } from '@/lib/jwt'

// GET /api/auth/callback
// ThaID OAuth2 callback - รับ code จาก DOPA แล้วแลกเป็น token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // ถ้า ThaID ส่ง error กลับมา
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'เกิดข้อผิดพลาด'
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=ไม่ได้รับ authorization code', request.url)
      )
    }

    // แลก code เป็น token และดึงข้อมูลผู้ใช้
    const authProvider = new ThaIDAuthProvider()

    try {
      const userProfile = await authProvider.handleCallback(code)

      // สร้าง JWT token
      const token = signToken(userProfile)

      // redirect ไปหน้า select พร้อมตั้ง cookie
      const response = NextResponse.redirect(
        new URL('/select', request.url)
      )
      response.headers.set('Set-Cookie', createJwtCookie(token))

      return response
    } catch (err) {
      let errorMessage = 'เกิดข้อผิดพลาดในการยืนยันตัวตน'

      if (err instanceof Error) {
        switch (err.message) {
          case 'NOT_FOUND':
            errorMessage = 'ไม่พบข้อมูลในระบบ HR'
            break
          case 'TOKEN_EXCHANGE_FAILED':
            errorMessage = 'ไม่สามารถแลก token ได้'
            break
          case 'NO_PID_IN_TOKEN_RESPONSE':
            errorMessage = 'ไม่ได้รับข้อมูลจาก ThaID'
            break
        }
      }

      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
      )
    }
  } catch (error) {
    console.error('ThaID callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=เกิดข้อผิดพลาดในระบบ', request.url)
    )
  }
}
