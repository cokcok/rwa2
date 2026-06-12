import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { APP_BASE_URL, withBasePath } from '@/lib/config'

// POST /api/auth/session
// รับ JWT token แล้ว set cookie (ใช้กับ cross-domain ThaID callback)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const token = formData.get('token') as string

    if (!token) {
      return NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/login')}?error=ไม่ได้รับ token`)
    }

    return await setSessionAndRedirect(token)
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/login')}?error=เกิดข้อผิดพลาด`)
  }
}

async function setSessionAndRedirect(token: string) {
  const payload = verifyToken(token)
  if (!payload) {
    console.error('Session: JWT verification failed')
    return NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/login')}?error=token ไม่ถูกต้อง`)
  }

  const redirectUrl = `${APP_BASE_URL}${withBasePath('/select')}`

  const response = NextResponse.redirect(redirectUrl)

  // ตั้ง session cookie พร้อม domain ชัดเจนสำหรับ cross-domain flow
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60, // 30 นาที
  })

  return response
}
