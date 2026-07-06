import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { getClientIp } from '@/lib/rate-limit'
import { executeQuery } from '@/lib/oracle'
import { getCached, setCache } from '@/lib/cache'
import { isIpInRange } from '@/lib/ip-check'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const payload = verifyToken(sessionCookie.value)
  if (!payload) {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 })
  }

  const clientIp = getClientIp(request)
  const orgCode = request.nextUrl.searchParams.get('org_code')
  let ipInRange = false
  let ipRangesCount = 0

  if (orgCode) {
    const cacheKey = `ip_range_${orgCode}`
    let ipRanges = getCached<{ IP_RANGE1: string; IP_RANGE2: string }[]>(cacheKey)

    if (!ipRanges) {
      const sql = `
        SELECT IP_RANGE1, IP_RANGE2
        FROM FSS.IPADDRESS_DEPT
        WHERE DEPT_ID = :dept_id
          AND CANCEL_FLG != '1'
      `
      ipRanges = await executeQuery<{ IP_RANGE1: string; IP_RANGE2: string }>(sql, { dept_id: orgCode })
      console.log('[IP_RANGE_DEBUG]', {
        dept_id: orgCode,
        dept_id_type: typeof orgCode,
        dept_id_length: orgCode?.length,
        rows_found: ipRanges.length,
      })
      if (ipRanges.length === 0) {
        const allSql = `SELECT IP_RANGE1, IP_RANGE2, CANCEL_FLG FROM FSS.IPADDRESS_DEPT WHERE DEPT_ID = :dept_id`
        const allRows = await executeQuery<{ IP_RANGE1: string; IP_RANGE2: string; CANCEL_FLG: string }>(allSql, { dept_id: orgCode })
        console.log('[IP_RANGE_ALL]', JSON.stringify(allRows))
      }
      if (ipRanges.length > 0) {
        setCache(cacheKey, ipRanges, 10 * 60 * 60 * 1000)
      }
    }

    ipRangesCount = ipRanges.length
    for (const range of ipRanges) {
      if (range.IP_RANGE1 && range.IP_RANGE2 && isIpInRange(clientIp, range.IP_RANGE1, range.IP_RANGE2)) {
        ipInRange = true
        break
      }
    }
  }

  return NextResponse.json({ client_ip: clientIp, ip_in_range: ipInRange, ip_ranges_count: ipRangesCount })
}
