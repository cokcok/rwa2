import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { getClientIp } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const payload = verifyToken(sessionCookie.value)
  if (!payload) {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 })
  }

  return NextResponse.json({ client_ip: getClientIp(request) })
}
