import { NextResponse } from 'next/server'

// POST /api/auth/logout
// ออกจากระบบโดยลบ session cookie
export async function POST() {
  const response = NextResponse.json({ success: true })

  // ลบ httpOnly cookie
  response.headers.set(
    'Set-Cookie',
    'session=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/'
  )

  return response
}
