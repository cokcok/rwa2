import crypto from 'crypto'
import { executeQuery } from './oracle'
import { mockEmployees } from './mock-data'
import type { AuthProvider, UserProfile, HrEmployee } from '@/types'

// HMAC key สำหรับ sign state parameter (CSRF protection แบบ cross-domain)
const HMAC_SECRET = process.env.JWT_SECRET || 'dev-secret-key-for-testing-only'

export function signState(state: string): string {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(state).digest('hex')
  return `${state}.${hmac}`
}

export function verifyState(signedState: string): boolean {
  const idx = signedState.lastIndexOf('.')
  if (idx === -1) return false
  const state = signedState.substring(0, idx)
  const receivedHmac = signedState.substring(idx + 1)
  const expectedHmac = crypto.createHmac('sha256', HMAC_SECRET).update(state).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(receivedHmac, 'hex'), Buffer.from(expectedHmac, 'hex'))
}

// Mock AuthProvider สำหรับ development
export class MockAuthProvider implements AuthProvider {
  getAuthUrl(): string {
    // Mock ไม่ต้อง redirect ไปไหน
    return '/api/auth/mock-thaid'
  }

  async handleCallback(code: string): Promise<UserProfile> {
    // Mock: code คือ national_id
    return this.authenticateByNationalId(code)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateToken(_token: string): Promise<UserProfile> {
    // Mock: ไม่ต้อง validate กับ external service
    throw new Error('Use JWT validation instead')
  }

  // ยืนยันตัวตนด้วยเลขบัตรประชาชน
  async authenticateByNationalId(nationalId: string): Promise<UserProfile> {
    // ใช้ mock data ถ้าเปิดใช้งาน
    if (process.env.USE_MOCK_DATA === 'true') {
      const emp = mockEmployees.find(e => e.PRV_CIZ_ID === nationalId)
      if (!emp) {
        throw new Error('NOT_FOUND')
      }
      return {
        emp_id: emp.EMP_CODE,
        national_id: emp.PRV_CIZ_ID,
        full_name: emp.EMP_NAME,
        org_code: emp.DEPT_PAID_CODE,
        org_name: emp.DEPT_PAID_NAME
      }
    }

    // Query ข้อมูลพนักงานจาก HR view
    const sql = `
      SELECT PRV_CIZ_ID, EMP_CODE, EMP_NAME, DEPT_PAID_CODE, DEPT_PAID_NAME
      FROM fss.V_PN_EMP_OTH
      WHERE PRV_CIZ_ID = :national_id
        AND EMP_STATUS != 4
    `

    const employees = await executeQuery<HrEmployee>(sql, { national_id: nationalId })

    if (employees.length === 0) {
      throw new Error('NOT_FOUND')
    }

    const emp = employees[0]

    return {
      emp_id: emp.EMP_CODE,
      national_id: emp.PRV_CIZ_ID,
      full_name: emp.EMP_NAME,
      org_code: emp.DEPT_PAID_CODE,
      org_name: emp.DEPT_PAID_NAME
    }
  }
}

// ThaIDAuthProvider สำหรับ production
export class ThaIDAuthProvider implements AuthProvider {
  private clientId: string
  private clientSecret: string
  private redirectUri: string
  private authorizeEndpoint: string
  private tokenEndpoint: string

  constructor() {
    this.clientId = process.env.THAID_CLIENT_ID || ''
    this.clientSecret = process.env.THAID_CLIENT_SECRET || ''
    this.redirectUri = process.env.THAID_REDIRECT_URI || ''
    this.authorizeEndpoint = process.env.THAID_AUTHORIZE_URL || 'https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/'
    this.tokenEndpoint = process.env.THAID_TOKEN_URL || 'https://imauth.bora.dopa.go.th/api/v2/oauth2/token/'
  }

  getAuthUrl(): string {
    // สร้าง random state สำหรับ CSRF protection (signed ด้วย HMAC)
    // ใช้ signed state แทน cookie เพื่อให้ข้าม subdomain ได้ (api.raot.co.th ↔ prog1-test.raot.co.th)
    const rawState = crypto.randomUUID()
    const state = signState(rawState)
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      verify_type: 'pin',
      scope: 'pid name birthdate',
      state: state
    })
    return `${this.authorizeEndpoint}?${params.toString()}`
  }

  async handleCallback(code: string): Promise<UserProfile> {
    // 1. แลก code เป็น token

    // Encode client credentials เป็น Base64 สำหรับ client_secret_basic
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

    const tokenResponse = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error('ThaID token exchange failed:', errText)
      throw new Error('TOKEN_EXCHANGE_FAILED')
    }

    const tokenData = await tokenResponse.json()

    const nationalId = tokenData.pid
    const thaiName = tokenData.name || ''
    const birthdate = tokenData.birthdate || ''

    if (!nationalId) {
      throw new Error('NO_PID_IN_TOKEN_RESPONSE')
    }

    // 3. ใช้ national_id ไป query ข้อมูลพนักงานจาก HR
    const profile = await this.authenticateByNationalId(nationalId)

    // เพิ่มข้อมูลจาก ThaID
    profile.thai_name = thaiName
    profile.birthdate = birthdate

    return profile
  }

  // ดึงข้อมูลพนักงานจาก HR ด้วย national_id (reuse จาก base logic)
  private async authenticateByNationalId(nationalId: string): Promise<UserProfile> {
    if (process.env.USE_MOCK_DATA === 'true') {
      const emp = mockEmployees.find(e => e.PRV_CIZ_ID === nationalId)
      if (!emp) throw new Error('NOT_FOUND')
      return {
        emp_id: emp.EMP_CODE,
        national_id: emp.PRV_CIZ_ID,
        full_name: emp.EMP_NAME,
        org_code: emp.DEPT_PAID_CODE,
        org_name: emp.DEPT_PAID_NAME
      }
    }

    const sql = `
      SELECT PRV_CIZ_ID, EMP_CODE, EMP_NAME, DEPT_PAID_CODE, DEPT_PAID_NAME
      FROM fss.V_PN_EMP_OTH
      WHERE PRV_CIZ_ID = :national_id
        AND EMP_STATUS != 4
    `

    const employees = await executeQuery<HrEmployee>(sql, { national_id: nationalId })

    if (employees.length === 0) {
      throw new Error('NOT_FOUND')
    }

    const emp = employees[0]
    return {
      emp_id: emp.EMP_CODE,
      national_id: emp.PRV_CIZ_ID,
      full_name: emp.EMP_NAME,
      org_code: emp.DEPT_PAID_CODE,
      org_name: emp.DEPT_PAID_NAME
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateToken(_token: string): Promise<UserProfile> {
    throw new Error('Use JWT validation instead')
  }
}

// Factory สำหรับสร้าง AuthProvider ตาม environment
export function createAuthProvider(): AuthProvider {
  const authType = process.env.AUTH_TYPE || 'mock'

  switch (authType) {
    case 'thaid':
      return new ThaIDAuthProvider()
    case 'mock':
    default:
      return new MockAuthProvider()
  }
}
