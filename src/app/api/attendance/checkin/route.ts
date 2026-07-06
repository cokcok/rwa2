import { NextRequest, NextResponse } from 'next/server'
import oracledb from '@/lib/oracle-init'
import { executeQuery, executeNonQuery } from '@/lib/oracle'
import { verifyToken } from '@/lib/jwt'
import { validateCheckinRequest } from '@/lib/validation'
import { CHECKIN_TYPES } from '@/config/checkin-types'
import type { CheckinType } from '@/config/checkin-types'
import { calculateDistance, isWithinRange } from '@/lib/geolocation'
import { isIpInRange } from '@/lib/ip-check'
import { getCached, setCache } from '@/lib/cache'
import { rateLimitMiddleware, getClientIp } from '@/lib/rate-limit'
import { mockOffices, mockAttendanceLogs } from '@/lib/mock-data'
import { parseUserAgent } from '@/lib/ua-parser'
import type { GisOffice } from '@/types'

// CHECKTYPE mapping: checkin_type → RWA_MAIN.CHECKTYPE
const CHECKTYPE_MAP: Record<string, string> = {
  OFFICE: '0',
  SUPPORT: '1',
  WFH: '3',
}

// POST /api/attendance/checkin
// ลงเวลาเข้า/ออกงาน
export async function POST(request: NextRequest) {
  // ตรวจสอบ rate limit
  const rateLimitResult = rateLimitMiddleware(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
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

    // อ่าน request body
    const body = await request.json()

    // ตรวจสอบ input
    const validation = validateCheckinRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: validation.error },
        { status: 400 }
      )
    }

    const { checkin_type, checkin_org_code, action_type, user_lat, user_lng, client_timestamp } = body
    const clientIp = getClientIp(request)
    let ipRangesCount = 0

    // ตรวจสอบว่าเวลาเครื่อง client ห่างจาก server เกินกำหนดหรือไม่
    if (client_timestamp) {
      const serverNow = Date.now()
      const diffMs = Math.abs(serverNow - client_timestamp)
      const maxDiffSec = parseInt(process.env.MAX_TIME_DIFF_SECONDS || '300')
      const maxDiffMs = maxDiffSec * 1000
      if (diffMs > maxDiffMs) {
        const diffSec = Math.round(diffMs / 1000)
        const diffMin = Math.round(diffSec / 60)
        return NextResponse.json(
          {
            error: 'TIME_MISMATCH',
            message: `เวลาเครื่องของคุณห่างจาก server เกิน ${diffMin} นาที กรุณาปรับเวลาเครื่องให้ถูกต้อง (ห่าง ${diffSec} วินาที)`,
          },
          { status: 400 }
        )
      }
    }

    // Mock mode
    if (process.env.USE_MOCK_DATA === 'true') {
      const skipLocationCheck = CHECKIN_TYPES[checkin_type as CheckinType]?.skipLocationCheck || false
      let distance = 0

      if (!skipLocationCheck) {
        // ดึงข้อมูลสำนักงานจาก mock data
        const office = mockOffices.find(o => o.ORG_CODE === checkin_org_code)
        if (!office) {
          return NextResponse.json(
            { error: 'OFFICE_NOT_FOUND', message: 'ไม่พบข้อมูลพิกัดสำนักงาน กรุณาติดต่อผู้ดูแลระบบ' },
            { status: 404 }
          )
        }

        const office_lat = office.LAT_WGS84
        const office_lng = office.LON_WGS84

        // คำนวณระยะห่าง
        distance = calculateDistance(user_lat, user_lng, office_lat, office_lng)
        const maxDistance = parseFloat(process.env.NEXT_PUBLIC_MAX_DISTANCE_METERS || '50')

        // ตรวจสอบว่าอยู่ในรัศมี
        if (!isWithinRange(distance, maxDistance)) {
          return NextResponse.json(
            {
              error: 'OUT_OF_RANGE',
              message: `คุณอยู่ห่างจากสำนักงาน ${distance.toFixed(1)} เมตร (ต้องไม่เกิน ${maxDistance} เมตร)`,
              distance_meter: distance,
              debug: { clientIp, dept_id: checkin_org_code, ipRanges_count: ipRangesCount, skipLocationCheck }
            },
            { status: 400 }
          )
        }
      }

      // บันทึก mock log
      const newLog = {
        emp_id: payload.emp_id,
        action_type: action_type as 'IN' | 'OUT',
        action_time: new Date()
      }
      mockAttendanceLogs.push(newLog)

      return NextResponse.json({
        success: true,
        log_id: mockAttendanceLogs.length,
        action_time: newLog.action_time.toISOString(),
        distance_meter: distance,
        debug: { clientIp, dept_id: checkin_org_code, ipRanges_count: 0, skipLocationCheck: true }
      })
    }

    // Real Oracle DB mode
    let skipLocationCheck = CHECKIN_TYPES[checkin_type as CheckinType]?.skipLocationCheck || false
    let office_lat = 0
    let office_lng = 0
    let distance = 0

    // ตรวจสอบ IP ว่าอยู่ในวงสำนักงานหรือไม่ (ถ้าใช่ ข้ามการเช็คพิกัด)
    if (!skipLocationCheck && clientIp) {
      const ipCacheKey = `ip_range_${checkin_org_code}`

      let ipRanges = getCached<{ IP_RANGE1: string; IP_RANGE2: string }[]>(ipCacheKey)

      if (!ipRanges) {
        const ipRangeSql = `
          SELECT IP_RANGE1, IP_RANGE2
          FROM FSS.IPADDRESS_DEPT
          WHERE DEPT_ID = :dept_id
            AND (CANCEL_FLG IS NULL OR CANCEL_FLG != '1')
        `
        ipRanges = await executeQuery<{ IP_RANGE1: string; IP_RANGE2: string }>(
          ipRangeSql,
          { dept_id: checkin_org_code }
        )
        if (ipRanges.length > 0) {
          setCache(ipCacheKey, ipRanges, 10 * 60 * 60 * 1000)
        }
      }

      ipRangesCount = ipRanges.length

      for (const range of ipRanges) {
        if (range.IP_RANGE1 && range.IP_RANGE2 && isIpInRange(clientIp, range.IP_RANGE1, range.IP_RANGE2)) {
          skipLocationCheck = true
          break
        }
      }
    }

    if (!skipLocationCheck) {
      // ดึงข้อมูลพิกัดสำนักงานจาก GIS (cache 1 ชม.)
      const officeCacheKey = `office_${checkin_org_code}`
      let office = getCached<GisOffice>(officeCacheKey)

      if (!office) {
        const officeSql = `
          SELECT DEPT_CODE as ORG_CODE, NAME_TH as ORG_NAME, LON_WGS84, LAT_WGS84
          FROM hrs.v_gis_raot_office
          WHERE DEPT_CODE = :org_code
        `
        const offices = await executeQuery<GisOffice>(officeSql, { org_code: checkin_org_code })

        if (offices.length === 0) {
          return NextResponse.json(
            { error: 'OFFICE_NOT_FOUND', message: 'ไม่พบข้อมูลพิกัดสำนักงาน กรุณาติดต่อผู้ดูแลระบบ' },
            { status: 404 }
          )
        }

        office = offices[0]
        setCache(officeCacheKey, office, 60 * 60 * 1000) // cache 1 ชม.
      }

      office_lat = office.LAT_WGS84
      office_lng = office.LON_WGS84
      // คำนวณระยะห่าง
      distance = calculateDistance(user_lat, user_lng, office_lat, office_lng)
      const maxDistance = parseFloat(process.env.NEXT_PUBLIC_MAX_DISTANCE_METERS || '50')

      // ตรวจสอบว่าอยู่ในรัศมี
      if (!isWithinRange(distance, maxDistance)) {
        return NextResponse.json(
          {
            error: 'OUT_OF_RANGE',
            message: `คุณอยู่ห่างจากสำนักงาน ${distance.toFixed(1)} เมตร (ต้องไม่เกิน ${maxDistance} เมตร)`,
            distance_meter: distance,
            debug: { clientIp, dept_id: checkin_org_code, ipRanges_count: ipRangesCount, skipLocationCheck }
          },
          { status: 400 }
        )
      }
    }

    // ดึงข้อมูล User-Agent
    const userAgent = request.headers.get('user-agent') || ''
    const uaInfo = parseUserAgent(userAgent)

    // แปลง checkin_type เป็น CHECKTYPE ของ RWA_MAIN
    const checktype = CHECKTYPE_MAP[checkin_type] || '0'
    const nodeid = action_type === 'IN' ? 1 : 2
    const kmValue = distance > 0 ? (distance / 1000).toFixed(3) : '0'

    // // ---- โค้ดเดิม: INSERT เข้า ATTENDANCE_LOG ----
    // const insertSql = `
    //   INSERT INTO ATTENDANCE_LOG (
    //     EMP_ID, NATIONAL_ID, FULL_NAME, CHECKIN_TYPE,
    //     HOME_ORG_CODE, CHECKIN_ORG_CODE, CHECKIN_ORG_NAME,
    //     ACTION_TYPE, ACTION_TIME,
    //     USER_LAT, USER_LNG, OFFICE_LAT, OFFICE_LNG,
    //     DISTANCE_METER, IS_WITHIN_RANGE, DEVICE_INFO, CLIENT_IP
    //   ) VALUES (
    //     :emp_id, :national_id, :full_name, :checkin_type,
    //     :home_org_code, :checkin_org_code, :checkin_org_name,
    //     :action_type, SYSTIMESTAMP AT TIME ZONE 'Asia/Bangkok',
    //     :user_lat, :user_lng, :office_lat, :office_lng,
    //     :distance_meter, :is_within_range, :device_info, :client_ip
    //   )
    //   RETURNING LOG_ID, ACTION_TIME INTO :log_id, :action_time
    // `
    //
    // const result = await executeNonQuery(insertSql, {
    //   emp_id: payload.emp_id,
    //   national_id: payload.national_id,
    //   full_name: payload.full_name,
    //   checkin_type: checkin_type,
    //   home_org_code: payload.org_code,
    //   checkin_org_code: checkin_org_code,
    //   checkin_org_name: checkinOrgName,
    //   action_type: action_type,
    //   user_lat: user_lat,
    //   user_lng: user_lng,
    //   office_lat: office_lat,
    //   office_lng: office_lng,
    //   distance_meter: distance,
    //   is_within_range: 'Y',
    //   device_info: deviceInfo,
    //   client_ip: clientIp,
    //   log_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    //   action_time: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
    // })
    //
    // const outBinds = result.outBinds as { log_id: number[]; action_time: Date[] }
    //
    // return NextResponse.json({
    //   success: true,
    //   log_id: outBinds.log_id[0],
    //   action_time: outBinds.action_time[0].toISOString(),
    //   distance_meter: distance
    // })

    // ---- INSERT เข้า RWA_MAIN ----
    const insertSql = `
      INSERT INTO FSS.RWA_MAIN_DEV (
        ID, EMP_CODE, LOGTIME, NODEID, DEPT_ID,
        LAT_WGS84, LON_WGS84,
        BROWSER, BROWSER_VERSION, DEVICE, OS, OS_VERSION, USERAGENT,
        IP_ADDRESS, CREATE_DATE, CHECKTYPE, KM, PHPIP, PROBLEM_CAUSE
      ) VALUES (
        FSS.RWA_MAIN_SEQ.NEXTVAL, :emp_code, SYSDATE, :nodeid, :dept_id,
        :lat_wgs84, :lon_wgs84,
        :browser, :browser_version, :device, :os, :os_version, :useragent,
        :ip_address, SYSDATE, :checktype, :km, :phpip, :problem_cause
      )
      RETURNING ID, LOGTIME INTO :id, :logtime
    `

    const result = await executeNonQuery(insertSql, {
      emp_code: payload.emp_id,
      nodeid: nodeid,
      dept_id: checkin_org_code,
      lat_wgs84: user_lat,
      lon_wgs84: user_lng,
      browser: uaInfo.browser,
      browser_version: uaInfo.browserVersion,
      device: uaInfo.device,
      os: uaInfo.os,
      os_version: uaInfo.osVersion,
      useragent: userAgent.substring(0, 255),
      ip_address: clientIp,
      checktype: checktype,
      km: kmValue,
      phpip: clientIp,
      problem_cause: null,
      id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      logtime: { dir: oracledb.BIND_OUT, type: oracledb.DATE }
    })

    const outBinds = result.outBinds as { id: number[]; logtime: Date[] }

    return NextResponse.json({
      success: true,
      log_id: outBinds.id[0],       // RWA_MAIN.ID
      action_time: outBinds.logtime[0].toISOString(),  // RWA_MAIN.LOGTIME
      distance_meter: distance,
      debug: { clientIp, dept_id: checkin_org_code, ipRanges_count: ipRangesCount, skipLocationCheck }
    })
  } catch (error) {
    console.error('Checkin error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    )
  }
}
