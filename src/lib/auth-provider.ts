import { executeQuery } from './oracle'
import { mockEmployees } from './mock-data'
import type { AuthProvider, UserProfile, HrEmployee } from '@/types'

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
  private userinfoEndpoint: string

  constructor() {
    this.clientId = process.env.THAID_CLIENT_ID || ''
    this.clientSecret = process.env.THAID_CLIENT_SECRET || ''
    this.redirectUri = process.env.THAID_REDIRECT_URI || ''
    this.authorizeEndpoint = process.env.THAID_AUTHORIZE_URL || 'https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/'
    this.tokenEndpoint = process.env.THAID_TOKEN_URL || 'https://imauth.bora.dopa.go.th/api/v2/oauth2/token/'
    this.userinfoEndpoint = process.env.THAID_USERINFO_URL || 'https://imauth.bora.dopa.go.th/api/v2/oauth2/userinfo/'
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'pid'
    })
    return `${this.authorizeEndpoint}?${params.toString()}`
  }

  async handleCallback(code: string): Promise<UserProfile> {
    // 1. แลก code เป็น token
    const tokenResponse = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error('ThaID token exchange failed:', errText)
      throw new Error('TOKEN_EXCHANGE_FAILED')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      throw new Error('NO_ACCESS_TOKEN')
    }

    // 2. ดึงข้อมูล user (pid = เลขบัตรประชาชน)
    const userinfoResponse = await fetch(this.userinfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userinfoResponse.ok) {
      console.error('ThaID userinfo failed:', await userinfoResponse.text())
      throw new Error('USERINFO_FAILED')
    }

    const userinfo = await userinfoResponse.json()
    const nationalId = userinfo.pid

    if (!nationalId) {
      throw new Error('NO_PID_IN_USERINFO')
    }

    // 3. ใช้ national_id ไป query ข้อมูลพนักงานจาก HR
    return this.authenticateByNationalId(nationalId)
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
