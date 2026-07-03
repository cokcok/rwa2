/**
 * ประเภทการลงเวลา
 *
 * เมื่อเพิ่ม type ใหม่ ต้อง update database CHECK constraint ด้วย:
 *   ALTER TABLE ATTENDANCE_LOG DROP CONSTRAINT chk_checkin_type;
 *   ALTER TABLE ATTENDANCE_LOG ADD CONSTRAINT chk_checkin_type
 *     CHECK (CHECKIN_TYPE IN ('OFFICE', 'SUPPORT', 'WFH', '...'));
 *
 * Fields:
 *   label               - ชื่อที่แสดงใน UI
 *   description         - คำอธิบาย
 *   color               - สี theme (blue/green/purple/orange)
 *   iconPath            - SVG path สำหรับ Heroicons
 *   requiresOfficeSelect - ต้องเลือกสำนักงานเอง (true) หรือใช้สังกัดตัวเอง (false)
 *   skipLocationCheck   - ข้ามการตรวจสอบ GPS (เช่น WFH ไม่ต้องอยู่ที่สำนักงาน)
 *   enabled             - เปิด/ปิดการแสดงประเภทนี้ในหน้าเลือก
 */
export const CHECKIN_TYPES = {
  OFFICE: {
    label: 'จากสำนักงาน',
    description: 'ลงเวลา ณ สำนักงานที่สังกัด',
    color: 'blue',
    iconPath: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    requiresOfficeSelect: false,
    skipLocationCheck: false,
    enabled: true,
  },
  SUPPORT: {
    label: 'ช่วยปฏิบัติงาน',
    description: 'ลงเวลา ณ สำนักงานอื่นที่ไปช่วยงาน',
    color: 'green',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    requiresOfficeSelect: true,
    skipLocationCheck: false,
    enabled: true,
  },
  WFH: {
    label: 'Work From Home',
    description: 'ลงเวลาจากที่บ้าน',
    color: 'purple',
    iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    requiresOfficeSelect: false,
    skipLocationCheck: true,
    enabled: false, // ปิดไว้ก่อน รอให้มีนโยบาย WFH ชัดเจนกว่านี้
  },
} as const

export type CheckinType = keyof typeof CHECKIN_TYPES

// Helper: ดึงเฉพาะ type ที่เปิดใช้งาน
export function getEnabledTypes() {
  return (Object.entries(CHECKIN_TYPES) as [CheckinType, typeof CHECKIN_TYPES[CheckinType]][])
    .filter(([, type]) => type.enabled)
}

// Helper: color classes for Tailwind
export function getTypeColorClasses(color: string) {
  const map: Record<string, { ring: string; bg: string; iconBg: string; iconText: string; text: string }> = {
    blue: {
      ring: 'ring-blue-500',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      text: 'text-blue-600',
    },
    green: {
      ring: 'ring-green-500',
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      text: 'text-green-600',
    },
    purple: {
      ring: 'ring-purple-500',
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      text: 'text-purple-600',
    },
    orange: {
      ring: 'ring-orange-500',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconText: 'text-orange-600',
      text: 'text-orange-600',
    },
  }
  return map[color] || map.blue
}
