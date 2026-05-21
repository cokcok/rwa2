// ตรวจสอบเลขบัตรประชาชนไทย 13 หลัก (Luhn-like algorithm ของไทย)
export function validateThaiNationalId(id: string): boolean {
  // ตรวจสอบความยาว 13 หลัก
  if (!/^\d{13}$/.test(id)) {
    return false
  }

  // คำนวณ checksum ตาม algorithm ของไทย
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id.charAt(i)) * (13 - i)
  }

  const remainder = sum % 11
  const checkDigit = (11 - remainder) % 10

  return checkDigit === parseInt(id.charAt(12))
}

// ตรวจสอบรูปแบบเลขบัตรประชาชน (format เท่านั้น ไม่รวม checksum)
export function isValidNationalIdFormat(id: string): boolean {
  return /^\d{13}$/.test(id)
}

// ตรวจสอบ checkin_type
export function isValidCheckinType(type: string): boolean {
  return ['OFFICE', 'SUPPORT'].includes(type)
}

// ตรวจสอบ action_type
export function isValidActionType(type: string): boolean {
  return ['IN', 'OUT'].includes(type)
}

// ตรวจสอบพิกัด (latitude/longitude)
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  )
}

// ตรวจสอบ org_code
export function isValidOrgCode(code: string): boolean {
  return typeof code === 'string' && code.trim().length > 0 && code.length <= 20
}

// ตรวจสอบ request body สำหรับลงเวลา
export function validateCheckinRequest(body: Record<string, unknown>): {
  valid: boolean
  error?: string
} {
  if (!body.checkin_type || !isValidCheckinType(body.checkin_type as string)) {
    return { valid: false, error: 'ประเภทการลงเวลาไม่ถูกต้อง' }
  }

  if (!body.checkin_org_code || !isValidOrgCode(body.checkin_org_code as string)) {
    return { valid: false, error: 'รหัสสังกัดไม่ถูกต้อง' }
  }

  if (!body.action_type || !isValidActionType(body.action_type as string)) {
    return { valid: false, error: 'ประเภทรายการไม่ถูกต้อง' }
  }

  if (body.user_lat === undefined || body.user_lng === undefined) {
    return { valid: false, error: 'กรุณาระบุพิกัด' }
  }

  if (!isValidCoordinate(body.user_lat as number, body.user_lng as number)) {
    return { valid: false, error: 'พิกัดไม่ถูกต้อง' }
  }

  return { valid: true }
}

// Sanitize string input (ป้องกัน injection)
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/[<>]/g, '')
}
