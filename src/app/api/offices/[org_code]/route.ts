import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/oracle'
import { verifyToken } from '@/lib/jwt'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { mockOffices } from '@/lib/mock-data'
import type { GisOffice, OfficeLocation } from '@/types'

// GET /api/offices/[org_code]
// ดึงพิกัดสำนักงานตาม org_code
export async function GET(
  request: NextRequest,
  { params }: { params: { org_code: string } }
) {
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

    const { org_code } = params

    // ตรวจสอบ org_code
    if (!org_code || typeof org_code !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_ORG_CODE', message: 'รหัสสังกัดไม่ถูกต้อง' },
        { status: 400 }
      )
    }

    // ใช้ mock data ถ้าเปิดใช้งาน
    if (process.env.USE_MOCK_DATA === 'true') {
      const office = mockOffices.find(o => o.ORG_CODE === org_code)
      if (!office) {
        return NextResponse.json(
          { error: 'OFFICE_NOT_FOUND', message: 'ไม่พบข้อมูลพิกัดสำนักงานของสังกัดคุณ กรุณาติดต่อผู้ดูแลระบบ' },
          { status: 404 }
        )
      }
      const result: OfficeLocation = {
        org_code: office.ORG_CODE,
        org_name: office.ORG_NAME,
        latitude: office.LAT_WGS84,
        longitude: office.LON_WGS84
      }
      return NextResponse.json(result)
    }

    // ดึงข้อมูลพิกัดสำนักงานจาก GIS view
    const sql = `
      SELECT ORG_CODE, ORG_NAME, LON_WGS84, LAT_WGS84
      FROM hrs.v_gis_raot_office
      WHERE ORG_CODE = :org_code
    `

    const offices = await executeQuery<GisOffice>(sql, { org_code })

    if (offices.length === 0) {
      return NextResponse.json(
        { error: 'OFFICE_NOT_FOUND', message: 'ไม่พบข้อมูลพิกัดสำนักงานของสังกัดคุณ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 404 }
      )
    }

    const office = offices[0]

    const result: OfficeLocation = {
      org_code: office.ORG_CODE,
      org_name: office.ORG_NAME,
      latitude: office.LAT_WGS84,
      longitude: office.LON_WGS84
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Office detail error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
