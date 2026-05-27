import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { ThaIDAuthProvider } from '@/lib/auth-provider'

// GET /api/auth/thaid-login
// สร้าง CSRF state, set cookie, แล้ว redirect ไป ThaID
export async function GET(request: NextRequest) {
  const authProvider = new ThaIDAuthProvider()

  // สร้าง random state สำหรับ CSRF protection
  const state = crypto.randomBytes(32).toString('hex')

  // สร้าง auth URL พร้อม state
  const authUrl = new URL(authProvider.getAuthUrl())
  authUrl.searchParams.set('state', state)

  // redirect ไป ThaID พร้อม set state cookie
  const response = NextResponse.redirect(authUrl.toString())
  response.cookies.set('thaid_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 นาที (ใช้ครั้งเดียว)
    path: '/',
  })

  return response
}
