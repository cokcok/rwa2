import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { APP_BASE_URL, withBasePath } from '@/lib/config'

// POST /api/auth/session
// รับ JWT token แล้ว set cookie (ใช้กับ cross-domain ThaID callback)
// รับ token จาก form body เท่านั้น (ไม่รับ query param เพื่อป้องกัน token leakage)
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
    return NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/login')}?error=token ไม่ถูกต้อง`)
  }

  const response = NextResponse.redirect(`${APP_BASE_URL}${withBasePath('/select')}`)
  response.headers.set('Set-Cookie',
    `session=${token}; HttpOnly; SameSite=Strict; Path=/; Secure`
  )

  return response
}
