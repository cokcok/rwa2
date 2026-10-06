import pkg from '../../package.json'

/**
 * เวอร์ชันของแอป — source of truth อยู่ที่ package.json ("version")
 * bump ด้วย: npm version patch | minor | major
 * (อัปเดต package.json + package-lock.json พร้อมกัน)
 */
export const APP_VERSION: string = pkg.version
