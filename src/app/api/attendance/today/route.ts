import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/oracle'
import { verifyToken } from '@/lib/jwt'
import { mockAttendanceLogs } from '@/lib/mock-data'


// GET /api/attendance/today
// ดึงข้อมูลลงเวลาของวันนี้สำหรับผู้ใช้ปัจจุบัน
export async function GET(request: NextRequest) {
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

    // Mock mode
    if (process.env.USE_MOCK_DATA === 'true') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayLogs = mockAttendanceLogs
        .filter(log => {
          const logDate = new Date(log.action_time)
          logDate.setHours(0, 0, 0, 0)
          return log.emp_id === payload.emp_id && logDate.getTime() === today.getTime()
        })
        .sort((a, b) => new Date(a.action_time).getTime() - new Date(b.action_time).getTime())
        .map((log, index) => ({
          log_id: index + 1,
          action_type: log.action_type,
          action_time: log.action_time.toISOString(),
        }))

      return NextResponse.json({ records: todayLogs })
    }

    // Real Oracle DB mode
    const sql = `
      SELECT LOG_ID, ACTION_TYPE, ACTION_TIME
      FROM ATTENDANCE_LOG
      WHERE EMP_ID = :emp_id
        AND TRUNC(ACTION_TIME) = TRUNC(SYSDATE)
      ORDER BY ACTION_TIME ASC
    `

    const records = await executeQuery<{ LOG_ID: number; ACTION_TYPE: string; ACTION_TIME: Date }>(
      sql,
      { emp_id: payload.emp_id }
    )

    const result = records.map(r => ({
      log_id: r.LOG_ID,
      action_type: r.ACTION_TYPE,
      action_time: r.ACTION_TIME instanceof Date ? r.ACTION_TIME.toISOString() : r.ACTION_TIME,
    }))

    return NextResponse.json({ records: result })
  } catch (error) {
    console.error('Fetch today attendance error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
