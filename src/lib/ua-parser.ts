/**
 * Parse User-Agent string เบื้องต้น (ไม่ต้อง install package)
 */

export interface UserAgentInfo {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  device: string
}

export function parseUserAgent(ua: string): UserAgentInfo {
  const result: UserAgentInfo = {
    browser: '',
    browserVersion: '',
    os: '',
    osVersion: '',
    device: '',
  }

  if (!ua) return result

  // Browser detection (เรียงจากเฉพาะไปทั่วไป)
  const browserPatterns: [RegExp, string][] = [
    [/Edg\/([\d.]+)/, 'Edge'],
    [/OPR\/([\d.]+)/, 'Opera'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/Safari\/([\d.]+)/, 'Safari'],
    [/MSIE ([\d.]+)/, 'IE'],
    [/Trident\/.*rv:([\d.]+)/, 'IE'],
  ]

  for (const [pattern, name] of browserPatterns) {
    const match = ua.match(pattern)
    if (match) {
      // ข้ามถ้าเป็น Chrome แต่ UA มี Edg (คือ Edge)
      if (name === 'Chrome' && /Edg\//.test(ua)) continue
      // ข้ามถ้าเป็น Safari แต่ UA มี Chrome (Chrome มี Safari ใน UA เสมอ)
      if (name === 'Safari' && /Chrome\//.test(ua)) continue
      result.browser = name
      result.browserVersion = match[1]
      break
    }
  }

  // OS detection
  const osPatterns: [RegExp, string, string][] = [
    [/Windows NT 10\.0/, 'Windows', '10'],
    [/Windows NT 11\.0/, 'Windows', '11'],
    [/Windows NT 6\.3/, 'Windows', '8.1'],
    [/Windows NT 6\.2/, 'Windows', '8'],
    [/Windows NT 6\.1/, 'Windows', '7'],
    [/Windows/, 'Windows', ''],
    [/Mac OS X ([\d_]+)/, 'macOS', ''],
    [/Android ([\d.]+)/, 'Android', ''],
    [/Android/, 'Android', ''],
    [/iPhone OS ([\d_]+)/, 'iOS', ''],
    [/iPad.*OS ([\d_]+)/, 'iOS', ''],
    [/iPhone/, 'iOS', ''],
    [/iPad/, 'iOS', ''],
    [/Linux/, 'Linux', ''],
    [/CrOS/, 'Chrome OS', ''],
  ]

  for (const [pattern, name, fixedVersion] of osPatterns) {
    const match = ua.match(pattern)
    if (match) {
      result.os = name
      if (fixedVersion) {
        result.osVersion = fixedVersion
      } else if (match[1]) {
        result.osVersion = match[1].replace(/_/g, '.')
      }
      break
    }
  }

  // Device type detection
  if (/Mobile|Android.*Mobile|iPhone|iPod/.test(ua)) {
    result.device = 'Mobile'
  } else if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) {
    result.device = 'Tablet'
  } else {
    result.device = 'Desktop'
  }

  return result
}
