import { NextResponse } from 'next/server'

// GET /api/time — ส่ง server time กลับมา (สำหรับ client sync)
export async function GET() {
  return NextResponse.json({
    timestamp: Date.now(),
    iso: new Date().toISOString(),
  })
}
