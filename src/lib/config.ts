// Base path สำหรับแอป (sync กับ nginx prefix)
// เปลี่ยนค่าใน .env.local: NEXT_PUBLIC_BASE_PATH=/worktime-test
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

// URL สำหรับ redirect กลับจาก callback (DOPA → api.raot.co.th → prog1-test)
export const APP_BASE_URL = process.env.APP_BASE_URL || 'https://prog1-test.raot.co.th'

// Helper สร้าง path ด้วย base path prefix
export function withBasePath(path: string): string {
  if (!BASE_PATH) return path
  // ป้องกัน double prefix
  if (path.startsWith(BASE_PATH)) return path
  return `${BASE_PATH}${path}`
}
