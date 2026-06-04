'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useIdleTimer } from '@/hooks/useIdleTimer'

const SKIP_PATHS = ['/login']

export default function IdleLogout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { logout } = useAuth()

  const isSkipPath = !pathname || SKIP_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  const timeoutMinutes = parseInt(process.env.IDLE_TIMEOUT_MINUTES || '10', 10)
  const timeoutMs = timeoutMinutes * 60 * 1000

  useIdleTimer({
    timeoutMs,
    onTimeout: () => {
      logout()
    },
    enabled: !isSkipPath,
  })

  return <>{children}</>
}
