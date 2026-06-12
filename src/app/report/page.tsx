'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/LoadingSpinner'
import { withBasePath } from '@/lib/config'

export default function ReportPage() {
  const { user, loading: authLoading } = useAuth()
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const handleDownload = async (format: 'pdf' | 'excel') => {
    if (!startDate || !endDate) {
      setError('กรุณาระบุวันที่เริ่มต้นและสิ้นสุด')
      return
    }

    if (startDate > endDate) {
      setError('วันที่เริ่มต้นต้องน้อยกว่าวันที่สิ้นสุด')
      return
    }

    setDownloading(true)
    setError('')

    try {
      const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        format,
      })

      const response = await fetch(`${bp}/api/attendance/report?${params}`)

      if (!response.ok) {
        const data = await response.json()
        setError(data.message || 'ไม่สามารถดาวน์โหลดรายงานได้')
        return
      }

      // ดาวน์โหลดไฟล์
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // ตั้งชื่อไฟล์
      const ext = format === 'pdf' ? 'pdf' : 'xlsx'
      link.download = `report_${user?.emp_id || 'user'}_${startDate}_${endDate}.${ext}`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setError('เกิดข้อผิดพลาดในการดาวน์โหลดรายงาน')
    } finally {
      setDownloading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">รายงานสรุปการเข้างาน</h1>
          <p className="text-gray-500 mt-2">ดาวน์ออกรายงานสรุปเวลาเข้างานของคุณ</p>
        </div>

        {/* ข้อมูลผู้ใช้ */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">ชื่อ-สกุล</p>
              <p className="font-medium text-gray-800">{user.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">รหัสพนักงาน</p>
              <p className="font-medium text-gray-800">{user.emp_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">แผนก</p>
              <p className="font-medium text-gray-800">{user.org_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">รหัสแผนก</p>
              <p className="font-medium text-gray-800">{user.org_code}</p>
            </div>
          </div>
        </div>

        {/* เลือกช่วงวันที่ */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">เลือกช่วงวันที่</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
              />
            </div>
          </div>
        </div>

        {/* แสดงข้อผิดพลาด */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* ปุ่มดาวน์โหลด */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">ดาวน์โหลดรายงาน</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {downloading ? (
                <LoadingSpinner />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              ดาวน์โหลด PDF
            </button>
            <button
              onClick={() => handleDownload('excel')}
              disabled={downloading}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {downloading ? (
                <LoadingSpinner />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              ดาวน์โหลด Excel
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">
            รายงานจะมีข้อมูลการเข้า-ออกงานในช่วงวันที่ที่เลือก
          </p>
        </div>

        {/* ปุ่มกลับ */}
        <div className="mt-6 text-center">
          <a
            href={withBasePath('/checkin')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            &larr; กลับไปหน้าลงเวลา
          </a>
        </div>
      </div>
    </div>
  )
}
