import { NextResponse } from 'next/server'
import { ThaIDAuthProvider } from '@/lib/auth-provider'

// GET /api/auth/thaid
// ส่ง ThaID authorization URL กลับให้ frontend พร้อม state cookie สำหรับ CSRF protection
export async function GET() {
  const authProvider = new ThaIDAuthProvider()
  const authUrl = authProvider.getAuthUrl()

  // ดึง state จาก URL เพื่อเก็บใน cookie
  const url = new URL(authUrl)
  const state = url.searchParams.get('state')

  const response = NextResponse.json({ auth_url: authUrl })

  // เก็บ state ใน cookie (httpOnly, secure, sameSite) สำหรับ CSRF validation
  if (state) {
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600, // 10 นาที
      path: '/',
      domain: '.raot.co.th'
    })
  }

  return response
}
