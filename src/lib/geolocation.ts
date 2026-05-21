// Haversine formula สำหรับคำนวณระยะทางระหว่าง 2 พิกัด (หน่วย: เมตร)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // รัศมีโลกเป็นเมตร

  // แปลงองศาเป็นเรเดียน
  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLng = toRadians(lng2 - lng1)

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  // ระยะทางเป็นเมตร
  const distance = R * c

  return Math.round(distance * 100) / 100 // ทศนิยม 2 ตำแหน่ง
}

// แปลงองศาเป็นเรเดียน
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// ตรวจสอบว่าอยู่ในรัศมีที่กำหนด (default 50 เมตร)
export function isWithinRange(distance: number, maxRange: number = 50): boolean {
  return distance <= maxRange
}

// จัดรูปแบบระยะทางสำหรับแสดงผล
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(1)} เมตร`
  }
  return `${(meters / 1000).toFixed(2)} กิโลเมตร`
}
