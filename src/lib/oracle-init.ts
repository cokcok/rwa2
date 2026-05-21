// Oracle DB initialization
// แยกไฟล์นี้ออกมาเพื่อจัดการ Oracle Instant Client initialization ก่อนใช้งาน

import oracledb from 'oracledb'

// ตั้งค่า Oracle Thick mode ถ้ามี ORACLE_CLIENT_PATH
// สำหรับ Thin mode (default) ไม่ต้องทำอะไรเพิ่ม
const clientPath = process.env.ORACLE_CLIENT_PATH
if (clientPath) {
  try {
    oracledb.initOracleClient({ libDir: clientPath })
    console.log('Oracle Thick mode initialized with client path:', clientPath)
  } catch (error) {
    // อาจถูก initialize แล้ว (hot reload) หรือ path ไม่ถูกต้อง
    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg.includes('DPI-1047') || errMsg.includes('already been initialized')) {
      console.warn('Oracle client already initialized or not found, continuing...')
    } else {
      console.error('Oracle client initialization error:', errMsg)
    }
  }
}

export default oracledb
