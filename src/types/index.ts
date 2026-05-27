// โครงสร้างข้อมูลผู้ใช้จาก HR
export interface UserProfile {
  emp_id: string
  national_id: string
  full_name: string
  org_code: string
  org_name: string
}

// Interface สำหรับ Auth Provider (รองรับ Mock และ ThaID จริง)
export interface AuthProvider {
  getAuthUrl(): string
  handleCallback(code: string): Promise<UserProfile>
  validateToken(token: string): Promise<UserProfile>
}

// ข้อมูลพิกัดสำนักงาน
export interface OfficeLocation {
  org_code: string
  org_name: string
  latitude: number
  longitude: number
}

// บันทึกเวลาทำงาน
export interface AttendanceRecord {
  log_id: number
  emp_id: string
  national_id: string
  full_name: string
  checkin_type: 'OFFICE' | 'SUPPORT'
  home_org_code: string
  checkin_org_code: string
  checkin_org_name: string
  action_type: 'IN' | 'OUT'
  action_time: string
  user_lat: number
  user_lng: number
  office_lat: number
  office_lng: number
  distance_meter: number
  is_within_range: 'Y' | 'N'
  device_info: string
  client_ip: string
  created_at: string
}

// คำขอลงเวลา
export interface CheckinRequest {
  checkin_type: 'OFFICE' | 'SUPPORT'
  checkin_org_code: string
  action_type: 'IN' | 'OUT'
  user_lat: number
  user_lng: number
}

// ผลลัพธ์การลงเวลา
export interface CheckinResponse {
  success: boolean
  log_id?: number
  action_time?: string
  distance_meter?: number
  error?: string
  message?: string
}

// JWT Payload
export interface JwtPayload {
  emp_id: string
  national_id: string
  full_name: string
  org_code: string
  org_name: string
  iat: number
  exp: number
}

// ข้อมูลจาก Oracle HR View
export interface HrEmployee {
  PRV_CIZ_ID: string
  EMP_CODE: string
  EMP_NAME: string
  DEPT_PAID_CODE: string
  DEPT_PAID_NAME: string
}

// ข้อมูลจาก Oracle GIS View
export interface GisOffice {
  ORG_CODE: string
  ORG_NAME: string
  LON_WGS84: number
  LAT_WGS84: number
}

// สถานะการลงเวลาล่าสุดของวันนี้
export interface LatestAttendance {
  ACTION_TYPE: 'IN' | 'OUT'
  ACTION_TIME: Date
}

// API Error Response
export interface ApiError {
  error: string
  message: string
}

// รายการลงเวลาของวันนี้
export interface TodayRecord {
  action_type: 'IN' | 'OUT'
  action_time: string
  checkin_type: 'OFFICE' | 'SUPPORT'
  checkin_org_name: string
  distance_meter: number
  full_name: string
}
