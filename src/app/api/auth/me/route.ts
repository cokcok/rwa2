import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

// GET /api/auth/me
// ดึงข้อมูลผู้ใช้จาก JWT cookie
export async function GET(request: NextRequest) {
  try {
    // ดึง cookie
    const sessionCookie = request.cookies.get('session')

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      )
    }

    // ตรวจสอบ JWT
    const payload = verifyToken(sessionCookie.value)

    if (!payload) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Session หมดอายุหรือไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    // ส่งข้อมูลผู้ใช้ (ไม่รวม national_id ใน response)
    return NextResponse.json({
      emp_id: payload.emp_id,
      full_name: payload.full_name,
      org_code: payload.org_code,
      org_name: payload.org_name,
      thai_name: payload.thai_name || '',
      birthdate: payload.birthdate || ''
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
