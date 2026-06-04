import { NextRequest, NextResponse } from 'next/server'
import oracledb from '@/lib/oracle-init'
import { verifyToken } from '@/lib/jwt'

// GET /api/test-db
// ทดสอบการเชื่อมต่อ Oracle DB (ต้อง login ก่อน)
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

  // ถ้าใช้ mock data ไม่ต้องเชื่อม DB
  if (process.env.USE_MOCK_DATA === 'true') {
    return NextResponse.json({
      status: 'mock',
      message: 'กำลังใช้ Mock Data (ไม่ได้เชื่อม Oracle DB)',
      use_mock_data: true
    })
  }

  // ตรวจสอบ Oracle Client mode
  const isThickMode = oracledb.thin === false
  const oracleClientPath = process.env.ORACLE_CLIENT_PATH

  // ลอง initialize Oracle Client อีกครั้ง
  if (!isThickMode) {
    try {
      if (!oracleClientPath) {
        console.warn('ORACLE_CLIENT_PATH is not set, skipping Oracle Client initialization')
      } else {
        oracledb.initOracleClient({ libDir: oracleClientPath })
      }
    } catch (error) {
      console.error('Failed to initialize Oracle Client:', error)
    }
  }
 
  try {
    // ทดสอบ query ง่ายๆ
    const { executeQuery } = await import('@/lib/oracle')
    const result = await executeQuery<{ DUAL_VALUE: string }>(
      'SELECT 1 AS DUAL_VALUE FROM DUAL'
    )

    return NextResponse.json({
      status: 'connected',
      message: 'เชื่อมต่อ Oracle DB สำเร็จ',
      use_mock_data: false,
      oracle_mode: oracledb.thin === false ? 'Thick' : 'Thin',
      oracle_client_path: oracleClientPath || 'ไม่ได้ตั้งค่า',
      test_query: result[0]?.DUAL_VALUE
    })
  } catch (error) {
    console.error('DB connection test error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'ไม่สามารถเชื่อมต่อ Oracle DB ได้',
        oracle_mode: oracledb.thin === false ? 'Thick' : 'Thin',
        oracle_client_path: oracleClientPath || 'ไม่ได้ตั้งค่า',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
