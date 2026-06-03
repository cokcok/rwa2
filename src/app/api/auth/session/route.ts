import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { APP_BASE_URL, withBasePath } from '@/lib/config'

// POST/GET /api/auth/session
// รับ JWT token แล้ว set cookie (ใช้กับ cross-domain ThaID callback)
// POST: token ใน form body
// GET: token ใน query param (ใช้ redirect จาก callback)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

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
