/**
 * ตรวจสอบ IP address ว่าอยู่ในช่วงที่กำหนดหรือไม่
 */

// แปลง IP address เป็นตัวเลขสำหรับเปรียบเทียบ
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return -1 // invalid IP
  }
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

// ตรวจสอบว่า IP อยู่ในช่วง start-end หรือไม่
export function isIpInRange(ip: string, startIp: string, endIp: string): boolean {
  const ipNum = ipToNumber(ip)
  const startNum = ipToNumber(startIp)
  const endNum = ipToNumber(endIp)

  if (ipNum === -1 || startNum === -1 || endNum === -1) {
    return false
  }

  return ipNum >= startNum && ipNum <= endNum
}
