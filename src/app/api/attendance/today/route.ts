import { NextRequest, NextResponse } from 'next/server'
import { executeQueryWithSessionTz } from '@/lib/oracle'
import { verifyToken } from '@/lib/jwt'
import { rateLimitMiddleware } from '@/lib/rate-limit'
import { mockAttendanceLogs } from '@/lib/mock-data'
import type { TodayRecord } from '@/types'

// GET /api/attendance/today
// ดึงประวัติการลงเวลาในวันนี้
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimitMiddleware(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
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

    // ─── Mock mode ────────────────────────────────────────────────────────────
    if (process.env.USE_MOCK_DATA === 'true') {
      const now = new Date()
      // หา Bangkok midnight → UTC
      const startOfDayUTC = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
        7 * 60 * 60 * 1000
      )
      const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000)

      console.log('[Today API][MOCK] emp_id:', payload.emp_id)
      console.log('[Today API][MOCK] startOfDayUTC:', startOfDayUTC.toISOString())
      console.log('[Today API][MOCK] endOfDayUTC:', endOfDayUTC.toISOString())
      console.log('[Today API][MOCK] total logs in store:', mockAttendanceLogs.length)
      console.log('[Today API][MOCK] all logs:', JSON.stringify(mockAttendanceLogs.map(l => ({
        emp_id: l.emp_id,
        action_type: l.action_type,
        action_time: l.action_time.toISOString()
      }))))

      const records: TodayRecord[] = mockAttendanceLogs
        .filter(
          (log) =>
            log.emp_id === payload.emp_id &&
            log.action_time >= startOfDayUTC &&
            log.action_time < endOfDayUTC
        )
        .sort((a, b) => a.action_time.getTime() - b.action_time.getTime())
        .map((log) => ({
          action_type: log.action_type,
          action_time: log.action_time.toISOString(),
          checkin_type: log.checkin_type,
          checkin_org_name: log.checkin_org_name,
          distance_meter: log.distance_meter,
          full_name: log.full_name,
        }))

      console.log('[Today API][MOCK] filtered records:', records.length)
      return NextResponse.json(records)
    }

    // ─── Real Oracle DB mode ──────────────────────────────────────────────────
    //
    //  ORA-01805 เกิดเพราะ timezone data file บน Oracle server มีปัญหา
    //  วิธีแก้:
    //    1. ALTER SESSION SET TIME_ZONE = '+07:00' → ใช้ numeric offset
    //       ไม่ต้อง lookup timezone region name
    //    2. CAST(ACTION_TIME AS DATE) → แปลง TSTZ → DATE ใน session TZ (+07:00)
    //       โดยใช้ stored offset (+07:00) ไม่ต้องค้น data file
    //    3. เปรียบเทียบกับ TO_DATE(:today) แบบ plain DATE
    //
    const now = new Date()
    const pad2 = (n: number) => String(n).padStart(2, '0')
    const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`

    const sql = `
      SELECT
          ACTION_TYPE,
          ACTION_TIME,
          CHECKIN_TYPE,
          CHECKIN_ORG_NAME,
          DISTANCE_METER,
          FULL_NAME
      FROM ATTENDANCE_LOG
      WHERE EMP_ID = :emp_id
        AND TRUNC(CAST(ACTION_TIME AS DATE)) = TO_DATE(:today, 'YYYY-MM-DD')
      ORDER BY ACTION_TIME ASC
    `

    console.log('[Today API][SQL]', sql.replace(/\s+/g, ' ').trim())
    console.log('[Today API][Params]', JSON.stringify({ emp_id: payload.emp_id, today: todayStr }))

    interface TodayRow {
      ACTION_TYPE: string
      ACTION_TIME: Date
      CHECKIN_TYPE: string
      CHECKIN_ORG_NAME: string
      DISTANCE_METER: number
      FULL_NAME: string
    }

    const rows = await executeQueryWithSessionTz<TodayRow>(sql, {
      emp_id: payload.emp_id,
      today: todayStr,
    })

    const records: TodayRecord[] = rows.map((row) => ({
      action_type:      row.ACTION_TYPE as 'IN' | 'OUT',
      action_time:
        row.ACTION_TIME instanceof Date
          ? row.ACTION_TIME.toISOString()
          : String(row.ACTION_TIME),
      checkin_type:     row.CHECKIN_TYPE as 'OFFICE' | 'SUPPORT',
      checkin_org_name: row.CHECKIN_ORG_NAME,
      distance_meter:   row.DISTANCE_METER,
      full_name:        row.FULL_NAME,
    }))

    return NextResponse.json(records)
  } catch (error) {
    console.error('Today records error:', error)

    // แยกประเภท Oracle DB error ออกมาเพื่อให้ log และ response ชัดเจนขึ้น
    if (error instanceof Error && error.message.includes('ORA-')) {
      console.error('Oracle DB error:', error.message)
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}