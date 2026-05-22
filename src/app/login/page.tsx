'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ThaiIdInput from '@/components/ThaiIdInput'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function LoginPage() {
  const [nationalId, setNationalId] = useState('1100800354530')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<{
    full_name: string
    org_name: string
  } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/mock-thaid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ national_id: nationalId }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'NOT_FOUND') {
          setError('ไม่พบข้อมูลในระบบ HR')
        } else {
          setError(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
        }
        return
      }

      // สำเร็จ - แสดงข้อมูลผู้ใช้
      setUserProfile({
        full_name: data.full_name,
        org_name: data.org_name
      })

      // redirect ไปหน้าเลือกประเภทหลังจาก 1.5 วินาที
      setTimeout(() => {
        router.push('/select')
      }, 1500)
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ถ้า login สำเร็จ แสดงข้อมูลผู้ใช้
  if (userProfile) {
    return (
      <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <svg
            className="w-16 h-16 text-green-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            เข้าสู่ระบบสำเร็จ
          </h2>
          <p className="text-gray-600 mb-1">{userProfile.full_name}</p>
          <p className="text-sm text-gray-500 mb-6">{userProfile.org_name}</p>
          <LoadingSpinner message="กำลังนำท่านไปยังหน้าลงเวลา..." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            เข้าสู่ระบบลงเวลาทำงาน
          </h2>
          <p className="text-gray-600">
            จำลองการยืนยันตัวตนด้วย ThaID
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ThaiIdInput
            value={nationalId}
            onChange={(value) => {
              setNationalId(value)
              setError('')
            }}
            error={error}
            disabled={loading}
          />

          {error && !nationalId && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || nationalId.length === 0}
            className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-lg"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>กำลังยืนยันตัวตน...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span>จำลองการยืนยันตัวตน</span>
              </>
            )}
          </button>
        </form>

        {/* ปุ่ม Login ด้วย ThaID */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">หรือ</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <img
              src="/thaid_icon.png"
              alt="ThaID"
              className="w-8 h-8"
            />
            <span className="text-blue-600 font-semibold text-lg">
              เข้าสู่ระบบด้วย ThaID
            </span>
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>หมายเหตุ:</strong> ระบบนี้เป็นเวอร์ชันจำลอง (Mock)
            สำหรับทดสอบเท่านั้น ใช้เลขบัตรประชาชน 13 หลักที่มีในระบบ HR
          </p>
        </div>
      </div>
    </div>
  )
}
