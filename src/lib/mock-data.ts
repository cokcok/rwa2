// Mock data สำหรับทดสอบโดยไม่ต้องเชื่อม Oracle DB

import type { HrEmployee, GisOffice } from '@/types'

// ข้อมูลพนักงานจำลอง
export const mockEmployees: HrEmployee[] = [
  {
    PRV_CIZ_ID: '1234567890123',
    EMP_CODE: 'EMP001',
    EMP_NAME: 'สมชาย ใจดี',
    DEPT_PAID_CODE: 'DEPT001',
    DEPT_PAID_NAME: 'สำนักงานเลขานุการ'
  },
  {
    PRV_CIZ_ID: '9876543210123',
    EMP_CODE: 'EMP002',
    EMP_NAME: 'สมหญิง รักงาน',
    DEPT_PAID_CODE: 'DEPT002',
    DEPT_PAID_NAME: 'กองแผนงาน'
  },
  {
    PRV_CIZ_ID: '1112223334445',
    EMP_CODE: 'EMP003',
    EMP_NAME: 'วิชัย เก่งมาก',
    DEPT_PAID_CODE: 'DEPT003',
    DEPT_PAID_NAME: 'กองคลัง'
  },
  // สำหรับทดสอบ (เลขสั้น)
  {
    PRV_CIZ_ID: '111',
    EMP_CODE: 'TEST01',
    EMP_NAME: 'ทดสอบ ระบบ',
    DEPT_PAID_CODE: 'DEPT001',
    DEPT_PAID_NAME: 'สำนักงานเลขานุการ'
  },
  {
    PRV_CIZ_ID: '222',
    EMP_CODE: 'TEST02',
    EMP_NAME: 'ทดลอง ใช้งาน',
    DEPT_PAID_CODE: 'DEPT002',
    DEPT_PAID_NAME: 'กองแผนงาน'
  }
]

// ข้อมูลสำนักงานจำลอง (พิกัดกรุงเทพฯ)
export const mockOffices: GisOffice[] = [
  {
    ORG_CODE: 'DEPT001',
    ORG_NAME: 'สำนักงานเลขานุการ',
    LON_WGS84: 100.4679,
    LAT_WGS84: 13.7718
  },
  {
    ORG_CODE: 'DEPT002',
    ORG_NAME: 'กองแผนงาน',
    LON_WGS84: 100.5028,
    LAT_WGS84: 13.7573
  },
  {
    ORG_CODE: 'DEPT003',
    ORG_NAME: 'กองคลัง',
    LON_WGS84: 100.5038,
    LAT_WGS84: 13.7583
  },
  {
    ORG_CODE: 'DEPT004',
    ORG_NAME: 'กองบุคคล',
    LON_WGS84: 100.5048,
    LAT_WGS84: 13.7593
  },
  {
    ORG_CODE: 'DEPT005',
    ORG_NAME: 'กองกฎหมาย',
    LON_WGS84: 100.5058,
    LAT_WGS84: 13.7603
  }
]

// บันทึกเวลาจำลอง (สำหรับทดสอบ double check-in)
export const mockAttendanceLogs: Array<{
  emp_id: string
  action_type: 'IN' | 'OUT'
  action_time: Date
}> = [
  // ตัวอย่าง: EMP001 เข้างานแล้ววันนี้
  // ( uncomment เพื่อทดสอบ double check-in )
  // {
  //   emp_id: 'EMP001',
  //   action_type: 'IN',
  //   action_time: new Date()
  // }
]
