import jwt from 'jsonwebtoken'
import type { JwtPayload, UserProfile } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-this'
const JWT_EXPIRES_IN = '8h' // อายุ 8 ชั่วโมง (1 วันทำงาน)

// สร้าง JWT token
export function signToken(user: UserProfile): string {
  const payload: Record<string, string> = {
    emp_id: user.emp_id,
    national_id: user.national_id,
    full_name: user.full_name,
    org_code: user.org_code,
    org_name: user.org_name
  }

  if (user.thai_name) payload.thai_name = user.thai_name
  if (user.birthdate) payload.birthdate = user.birthdate

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  })
}

// ตรวจสอบ JWT token
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as JwtPayload

    return decoded
  } catch {
    // ไม่ log error ที่มีข้อมูล sensitive
    return null
  }
}

// สร้าง cookie string สำหรับ JWT
export function createJwtCookie(token: string): string {
  const maxAge = 8 * 60 * 60 // 8 ชั่วโมงเป็นวินาที
  const isProduction = process.env.NODE_ENV === 'production'

  return [
    `session=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
    'Path=/',
    isProduction ? 'Secure' : ''
  ]
    .filter(Boolean)
    .join('; ')
}

// สร้าง cookie สำหรับ logout (ลบ cookie)
export function createLogoutCookie(): string {
  return 'session=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/'
}
