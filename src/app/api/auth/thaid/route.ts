import { NextResponse } from 'next/server'
import { ThaIDAuthProvider } from '@/lib/auth-provider'

// GET /api/auth/thaid
// ส่ง ThaID authorization URL กลับให้ frontend
export async function GET() {
  const authProvider = new ThaIDAuthProvider()
  const authUrl = authProvider.getAuthUrl()

  return NextResponse.json({ auth_url: authUrl })
}
