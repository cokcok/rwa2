import { NextRequest, NextResponse } from 'next/server'
import oracledb from '@/lib/oracle-init'
import { executeQuery, executeNonQuery } from '@/lib/oracle'
import { verifyToken } from '@/lib/jwt'
import { validateCheckinRequest } from '@/lib/validation'
import { calculateDistance, isWithinRange } from '@/lib/geolocation'
import { rateLimitMiddleware, getClientIp } from '@/lib/rate-limit'
import { mockOffices, mockAttendanceLogs } from '@/lib/mock-data'
import type { GisOffice } from '@/types'

// POST /api/attendance/checkin
// ลงเวลาเข้า/ออกงาน
export async function POST(request: NextRequest) {
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

    // อ่าน request body
    const body = await request.json()

    // ตรวจสอบ input
    const validation = validateCheckinRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: validation.error },
        { status: 400 }
      )
    }

    const { checkin_type, checkin_org_code, action_type, user_lat, user_lng } = body

    // Mock mode
    if (process.env.USE_MOCK_DATA === 'true') {
      // ดึงข้อมูลสำนักงานจาก mock data
      const office = mockOffices.find(o => o.ORG_CODE === checkin_org_code)
      if (!office) {
        return NextResponse.json(
          { error: 'OFFICE_NOT_FOUND', message: 'ไม่พบข้อมูลพิกัดสำนักงาน กรุณาติดต่อผู้ดูแลระบบ' },
          { status: 404 }
        )
      }

      const office_lat = office.LAT_WGS84
      const office_lng = office.LON_WGS84

      // คำนวณระยะห่าง
      const distance = calculateDistance(user_lat, user_lng, office_lat, office_lng)
      const maxDistance = parseFloat(process.env.MAX_DISTANCE_METERS || '50')

      // ตรวจสอบว่าอยู่ในรัศมี
      if (!isWithinRange(distance, maxDistance)) {
        return NextResponse.json(
          {
            error: 'OUT_OF_RANGE',
            message: `คุณอยู่ห่างจากสำนักงาน ${distance.toFixed(1)} เมตร (ต้องไม่เกิน ${maxDistance} เมตร)`,
            distance_meter: distance
          },
          { status: 400 }
        )
      }

      // บันทึก mock log
      const newLog = {
        emp_id: payload.emp_id,
        national_id: payload.national_id,
        full_name: payload.full_name,
        checkin_type: checkin_type,
        checkin_org_code: checkin_org_code,
        checkin_org_name: office.ORG_NAME,
        action_type: action_type as 'IN' | 'OUT',
        action_time: new Date(),
        user_lat: user_lat,
        user_lng: user_lng,
        office_lat: office_lat,
        office_lng: office_lng,
        distance_meter: distance
      }
      mockAttendanceLogs.push(newLog)

      return NextResponse.json({
        success: true,
        log_id: mockAttendanceLogs.length,
        action_time: newLog.action_time.toISOString(),
        distance_meter: distance
      })
    }

    // Real Oracle DB mode
    // ดึงข้อมูลพิกัดสำนักงานจาก GIS
    const officeSql = `
      SELECT DEPT_CODE as ORG_CODE, NAME_TH as ORG_NAME, LON_WGS84, LAT_WGS84
      FROM hrs.v_gis_raot_office
      WHERE DEPT_CODE = :org_code
    `

    const offices = await executeQuery<GisOffice>(officeSql, { org_code: checkin_org_code })

    if (offices.length === 0) {
      return NextResponse.json(
        { error: 'OFFICE_NOT_FOUND', message: 'ไม่พบข้อมูลพิกัดสำนักงาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 404 }
      )
    }

    const office = offices[0]
    const office_lat = office.LAT_WGS84
    const office_lng = office.LON_WGS84

    // คำนวณระยะห่าง
    const distance = calculateDistance(user_lat, user_lng, office_lat, office_lng)
    const maxDistance = parseFloat(process.env.MAX_DISTANCE_METERS || '50')

    // ตรวจสอบว่าอยู่ในรัศมี
    if (!isWithinRange(distance, maxDistance)) {
      return NextResponse.json(
        {
          error: 'OUT_OF_RANGE',
          message: `คุณอยู่ห่างจากสำนักงาน ${distance.toFixed(1)} เมตร (ต้องไม่เกิน ${maxDistance} เมตร)`,
          distance_meter: distance
        },
        { status: 400 }
      )
    }

    // ดึงข้อมูล User-Agent สำหรับ audit trail
    const userAgent = request.headers.get('user-agent') || ''
    const deviceInfo = userAgent.substring(0, 500) // จำกัดความยาว

    // ดึง IP address ของเครื่องผู้ใช้
    const clientIp = getClientIp(request)

    // บันทึก ATTENDANCE_LOG
    const insertSql = `
      INSERT INTO ATTENDANCE_LOG (
        EMP_ID, NATIONAL_ID, FULL_NAME, CHECKIN_TYPE,
        HOME_ORG_CODE, CHECKIN_ORG_CODE, CHECKIN_ORG_NAME,
        ACTION_TYPE, ACTION_TIME,
        USER_LAT, USER_LNG, OFFICE_LAT, OFFICE_LNG,
        DISTANCE_METER, IS_WITHIN_RANGE, DEVICE_INFO, CLIENT_IP
      ) VALUES (
        :emp_id, :national_id, :full_name, :checkin_type,
        :home_org_code, :checkin_org_code, :checkin_org_name,
        :action_type, SYSTIMESTAMP AT TIME ZONE 'Asia/Bangkok',
        :user_lat, :user_lng, :office_lat, :office_lng,
        :distance_meter, :is_within_range, :device_info, :client_ip
      )
      RETURNING LOG_ID, ACTION_TIME INTO :log_id, :action_time
    `

    const result = await executeNonQuery(insertSql, {
      emp_id: payload.emp_id,
      national_id: payload.national_id,
      full_name: payload.full_name,
      checkin_type: checkin_type,
      home_org_code: payload.org_code,
      checkin_org_code: checkin_org_code,
      checkin_org_name: office.ORG_NAME,
      action_type: action_type,
      user_lat: user_lat,
      user_lng: user_lng,
      office_lat: office_lat,
      office_lng: office_lng,
      distance_meter: distance,
      is_within_range: 'Y',
      device_info: deviceInfo,
      client_ip: clientIp,
      log_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      action_time: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
    })

    const outBinds = result.outBinds as { log_id: number[]; action_time: Date[] }

    return NextResponse.json({
      success: true,
      log_id: outBinds.log_id[0],
      action_time: outBinds.action_time[0].toISOString(),
      distance_meter: distance
    })
  } catch (error) {
    console.error('Checkin error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
