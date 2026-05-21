import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/oracle'
import { verifyToken } from '@/lib/jwt'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { mockOffices } from '@/lib/mock-data'
import type { GisOffice, OfficeLocation } from '@/types'

// GET /api/offices
// ดึงรายชื่อสังกัดทั้งหมดจาก GIS (สำหรับ Dropdown "ช่วยปฏิบัติงาน")
export async function GET(request: NextRequest) {
  // ตรวจสอบ rate limit
  const rateLimitResult = rateLimitMiddleware(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    // ตรวจสอบ authentication
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      )
    }

    const payload = verifyToken(sessionCookie.value)
    if (!payload) {
      return NextResponse.json(
        { error: 'INVALID_TOKEN', message: 'Session หมดอายุหรือไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    // ใช้ mock data ถ้าเปิดใช้งาน
    if (process.env.USE_MOCK_DATA === 'true') {
      const result: OfficeLocation[] = mockOffices.map(office => ({
        org_code: office.ORG_CODE,
        org_name: office.ORG_NAME,
        latitude: office.LAT_WGS84,
        longitude: office.LON_WGS84
      }))
      return NextResponse.json(result)
    }

    // ดึงข้อมูลสังกัดจาก GIS view
    const sql = `
      SELECT ORG_CODE, ORG_NAME, LON_WGS84, LAT_WGS84
      FROM hrs.v_gis_raot_office
      ORDER BY ORG_CODE
    `

    const offices = await executeQuery<GisOffice>(sql)

    // แปลงเป็น format ที่ต้องการ
    const result: OfficeLocation[] = offices.map(office => ({
      org_code: office.ORG_CODE,
      org_name: office.ORG_NAME,
      latitude: office.LAT_WGS84,
      longitude: office.LON_WGS84
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Offices error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
