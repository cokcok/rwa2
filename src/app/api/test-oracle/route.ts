import { NextResponse } from 'next/server'
import oracledb from '@/lib/oracle-init'

// GET /api/test-oracle
// ทดสอบ Oracle Client initialization
export async function GET() {
  // ทดสอบ initialization อีกครั้งใน runtime
  const oracleClientPath = 'C:\\oracle_instant\\instantclient_19_30'

  try {
    // ลอง initialize อีกครั้ง
    oracledb.initOracleClient({ libDir: oracleClientPath })
  } catch {
    // ถ้า already initialized ไม่ต้องทำอะไร
  }

  return NextResponse.json({
    thin: oracledb.thin,
    clientPath: oracleClientPath,
    version: oracledb.versionString
  })
}
