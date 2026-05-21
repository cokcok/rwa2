import { NextRequest, NextResponse } from 'next/server'
import { MockAuthProvider } from '@/lib/auth-provider'
import { signToken, createJwtCookie } from '@/lib/jwt'
import { rateLimitMiddleware } from '@/lib/rate-limit'

// POST /api/auth/mock-thaid
// ยืนยันตัวตนด้วยเลขบัตรประชาชน (Mock สำหรับ development)
export async function POST(request: NextRequest) {
  // ตรวจสอบ rate limit
  const rateLimitResult = rateLimitMiddleware(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    const body = await request.json()
    const { national_id } = body

    // ตรวจสอบ input
    if (!national_id || typeof national_id !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_ID_FORMAT', message: 'กรุณาระบุเลขบัตรประชาชน' },
        { status: 400 }
      )
    }

    // ยืนยันตัวตนผ่าน MockAuthProvider
    const authProvider = new MockAuthProvider()

    try {
      const userProfile = await authProvider.authenticateByNationalId(national_id)

      // สร้าง JWT token
      const token = signToken(userProfile)

      // สร้าง response พร้อม cookie
      const response = NextResponse.json({
        emp_id: userProfile.emp_id,
        full_name: userProfile.full_name,
        org_code: userProfile.org_code,
        org_name: userProfile.org_name
      })

      // ตั้งค่า httpOnly cookie
      response.headers.set('Set-Cookie', createJwtCookie(token))

      return response
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return NextResponse.json(
          { error: 'NOT_FOUND', message: 'ไม่พบข้อมูลในระบบ HR' },
          { status: 404 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
