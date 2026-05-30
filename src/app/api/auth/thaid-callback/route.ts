import { NextRequest, NextResponse } from 'next/server'
import { ThaIDAuthProvider } from '@/lib/auth-provider'
import { signToken } from '@/lib/jwt'
import { APP_BASE_URL, withBasePath } from '@/lib/config'

// GET /api/auth/thaid-callback
// ThaID OAuth2 callback - รับ code จาก DOPA แลกเป็น token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // ถ้า ThaID ส่ง error กลับมา
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'เกิดข้อผิดพลาด'
      return NextResponse.redirect(
        `${APP_BASE_URL}${withBasePath('/login')}?error=${encodeURIComponent(errorDescription)}`
      )
    }

    console.log('ThaID callback code:', code)

    if (!code) {
      return NextResponse.redirect(
        `${APP_BASE_URL}${withBasePath('/login')}?error=ไม่ได้รับ authorization code`
      )
    }

    // แลก code เป็น token และดึงข้อมูลผู้ใช้
    const authProvider = new ThaIDAuthProvider()

    try {
      const userProfile = await authProvider.handleCallback(code)

      // สร้าง JWT token
      const token = signToken(userProfile)

      // ส่ง HTML form auto-submit ไป prog1-test เพื่อ set cookie (cross-domain)
      const html = `<!DOCTYPE html>
<html>
<head><title>กำลังเข้าสู่ระบบ...</title></head>
<body>
<form id="f" method="POST" action="${APP_BASE_URL}${withBasePath('/api/auth/session')}">
  <input type="hidden" name="token" value="${token}" />
</form>
<script>document.getElementById('f').submit();</script>
</body>
</html>`

      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    } catch (err) {
      let errorMessage = 'เกิดข้อผิดพลาดในการยืนยันตัวตน'

      if (err instanceof Error) {
        switch (err.message) {
          case 'NOT_FOUND':
            errorMessage = 'ไม่พบข้อมูลในระบบ HR'
            break
          case 'TOKEN_EXCHANGE_FAILED':
            errorMessage = 'ไม่สามารถแลก token ได้'
            break
          case 'NO_PID_IN_TOKEN_RESPONSE':
            errorMessage = 'ไม่ได้รับข้อมูลจาก ThaID'
            break
        }
      }

      return NextResponse.redirect(
        `${APP_BASE_URL}${withBasePath('/login')}?error=${encodeURIComponent(errorMessage)}`
      )
    }
  } catch (error) {
    console.error('ThaID callback error:', error)
    return NextResponse.redirect(
      `${APP_BASE_URL}${withBasePath('/login')}?error=เกิดข้อผิดพลาดในระบบ`
    )
  }
}
