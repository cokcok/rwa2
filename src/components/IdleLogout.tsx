'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useIdleTimer } from '@/hooks/useIdleTimer'

const SKIP_PATHS = ['/login', '/test-db']

export default function IdleLogout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const isSkipPath = !pathname || SKIP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  const handleLogout = async () => {
    try {
      const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
      await fetch(`${bp}/api/auth/logout`, { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      router.push('/login')
    }
  }

  const timeoutMinutes = parseInt(process.env.IDLE_TIMEOUT_MINUTES || '10', 10)
  const timeoutMs = timeoutMinutes * 60 * 1000

  useIdleTimer({
    timeoutMs,
    onTimeout: handleLogout,
    enabled: !isSkipPath,
  })

  return <>{children}</>
}
