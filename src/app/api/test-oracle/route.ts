import { NextRequest, NextResponse } from 'next/server'
import oracledb from '@/lib/oracle-init'
import { verifyToken } from '@/lib/jwt'

// GET /api/test-oracle
// ทดสอบ Oracle Client initialization (ต้อง login ก่อน)
export async function GET(request: NextRequest) {
  // ตรวจสอบ authentication
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'กรุณาเข้าสู่ระบบ' },
      { status: 401 }
    )
  }

  const payload = verifyToken(sessionCookie.value)
  if (!payload) {
    return NextResponse.json(
      { error: 'INVALID_TOKEN', message: 'Session หมดอายุหรือไม่ถูกต้อง' },
      { status: 401 }
    )
  }

  // ทดสอบ initialization อีกครั้งใน runtime
  const oracleClientPath = process.env.ORACLE_CLIENT_PATH || ''

  try {
    // ลอง initialize อีกครั้ง
    if (oracleClientPath) {
      oracledb.initOracleClient({ libDir: oracleClientPath })
    }
  } catch {
    // ถ้า already initialized ไม่ต้องทำอะไร
  }

  return NextResponse.json({
    thin: oracledb.thin,
    clientPath: oracleClientPath || 'ไม่ได้ตั้งค่า',
    version: oracledb.versionString
  })
}
