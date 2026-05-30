import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { APP_BASE_URL, withBasePath } from '@/lib/config'

// POST /api/auth/session
// รับ JWT token จาก form POST แล้ว set cookie (ใช้กับ cross-domain ThaID callback)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const token = formData.get('token') as string

    if (!token) {
      return NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/login')}?error=ไม่ได้รับ token`)
    }

    // ตรวจสอบ token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/login')}?error=token ไม่ถูกต้อง`)
    }

    // set cookie แล้ว redirect ไป select
    const maxAge = 8 * 60 * 60
    const response = NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/select')}`)
    response.headers.set('Set-Cookie',
      `session=${token}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Path=/; Secure`
    )

    return response
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/login')}?error=เกิดข้อผิดพลาด`)
  }
}
