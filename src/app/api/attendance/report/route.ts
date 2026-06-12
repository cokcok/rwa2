import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/oracle'
import { verifyToken } from '@/lib/jwt'
import { generatePdfBuffer } from '@/lib/pdf-generator'
import { generateExcelBuffer } from '@/lib/excel-generator'
import type { ReportRecord } from '@/lib/pdf-generator'

// Mock data สำหรับรายงาน
const mockReportRecords: ReportRecord[] = [
  { LOGTIME: new Date('2026-06-01T08:25:00+07:00'), NODEID: 1, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-01T17:05:00+07:00'), NODEID: 2, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-02T08:35:00+07:00'), NODEID: 1, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-02T17:10:00+07:00'), NODEID: 2, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-03T08:20:00+07:00'), NODEID: 1, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-03T16:50:00+07:00'), NODEID: 2, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-04T08:15:00+07:00'), NODEID: 1, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-04T17:00:00+07:00'), NODEID: 2, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-05T09:00:00+07:00'), NODEID: 1, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
  { LOGTIME: new Date('2026-06-05T17:15:00+07:00'), NODEID: 2, CHECKTYPE: '0', DEPT_ID: 'DEPT001', KM: '0.025' },
]

// GET /api/attendance/report?start_date=2026-06-01&end_date=2026-06-30&format=pdf
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

    // รับ parameters
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const format = searchParams.get('format') || 'pdf'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'กรุณาระบุวันที่เริ่มต้นและสิ้นสุด' },
        { status: 400 }
      )
    }

    if (format !== 'pdf' && format !== 'excel') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'ประเภทไฟล์ต้องเป็น pdf หรือ excel' },
        { status: 400 }
      )
    }

    let records: ReportRecord[] = []
    const fullName = payload.full_name || 'ทดสอบ ระบบ'
    const deptId = payload.org_code || 'DEPT001'

    // Mock mode
    if (process.env.USE_MOCK_DATA === 'true') {
      // ใช้ mock data
      records = mockReportRecords.filter(r => {
        const logDate = new Date(r.LOGTIME)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        return logDate >= start && logDate <= end
      })
    } else {
      // Query จาก Oracle DB
      const sql = `
        SELECT LOGTIME, NODEID, CHECKTYPE, DEPT_ID, KM
        FROM FSS.RWA_MAIN_DEV
        WHERE EMP_CODE = :emp_code
          AND TRUNC(LOGTIME) BETWEEN TO_DATE(:start_date, 'YYYY-MM-DD')
                                  AND TO_DATE(:end_date, 'YYYY-MM-DD')
        ORDER BY LOGTIME ASC
      `

      records = await executeQuery<ReportRecord>(sql, {
        emp_code: payload.emp_id,
        start_date: startDate,
        end_date: endDate,
      })
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'NO_DATA', message: 'ไม่พบข้อมูลในช่วงวันที่ที่เลือก' },
        { status: 404 }
      )
    }

    const reportData = {
      empCode: payload.emp_id,
      fullName,
      deptId,
      startDate,
      endDate,
      records,
    }

    // สร้างไฟล์ตาม format
    if (format === 'pdf') {
      const pdfBuffer = await generatePdfBuffer(reportData)
      const filename = `report_${payload.emp_id}_${startDate}_${endDate}.pdf`
      const uint8Array = new Uint8Array(pdfBuffer)

      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          'Content-Length': uint8Array.length.toString(),
        },
      })
    } else {
      const excelBuffer = await generateExcelBuffer(reportData)
      const filename = `report_${payload.emp_id}_${startDate}_${endDate}.xlsx`
      const uint8Array = new Uint8Array(excelBuffer)

      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          'Content-Length': uint8Array.length.toString(),
        },
      })
    }
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในการสร้างรายงาน' },
      { status: 500 }
    )
  }
}
