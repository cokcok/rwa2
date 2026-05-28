'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  emp_id: string
  full_name: string
  org_code: string
  org_name: string
  thai_name?: string
  birthdate?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data)
      } else {
        // ไม่ได้ login → redirect ไปหน้า login
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // เรียก server-side endpoint เพื่อลบ httpOnly cookie
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      router.push('/login')
    }
  }

  return { user, loading, logout, checkAuth }
}
