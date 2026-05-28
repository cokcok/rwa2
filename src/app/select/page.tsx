'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import OfficeSelector from '@/components/OfficeSelector'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { OfficeLocation } from '@/types'

export default function SelectPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [selectedType, setSelectedType] = useState<'OFFICE' | 'SUPPORT' | null>(null)
  const [selectedOrgCode, setSelectedOrgCode] = useState('')
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ถ้ายังไม่ได้ login จะถูก redirect โดย useAuth hook

  const handleTypeSelect = (type: 'OFFICE' | 'SUPPORT') => {
    setSelectedType(type)
    setError('')
    setSelectedOrgCode('')
    setSelectedOffice(null)
  }

  const handleOfficeSelect = (orgCode: string, office: OfficeLocation | null) => {
    setSelectedOrgCode(orgCode)
    setSelectedOffice(office)
    setError('')
  }

  const handleProceed = async () => {
    setError('')
    setLoading(true)

    try {
      if (selectedType === 'OFFICE') {
        // ดึงพิกัดสำนักงานของพนักงาน
        const response = await fetch(`/api/offices/${user?.org_code}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('ไม่พบข้อมูลพิกัดสำนักงานของสังกัดคุณ กรุณาติดต่อผู้ดูแลระบบ')
          } else {
            setError('เกิดข้อผิดพลาดในการดึงข้อมูลพิกัด')
          }
          return
        }
        const officeData = await response.json()
        setSelectedOffice(officeData)

        // เก็บข้อมูลใน sessionStorage สำหรับหน้า checkin
        sessionStorage.setItem('checkin_type', 'OFFICE')
        sessionStorage.setItem('checkin_org_code', user?.org_code || '')
        sessionStorage.setItem('checkin_org_name', user?.org_name || '')
        sessionStorage.setItem('office_lat', officeData.latitude.toString())
        sessionStorage.setItem('office_lng', officeData.longitude.toString())

        router.push('/checkin')
      } else if (selectedType === 'SUPPORT') {
        if (!selectedOrgCode || !selectedOffice) {
          setError('กรุณาเลือกสังกัด')
          return
        }

        // เก็บข้อมูลใน sessionStorage สำหรับหน้า checkin
        sessionStorage.setItem('checkin_type', 'SUPPORT')
        sessionStorage.setItem('checkin_org_code', selectedOrgCode)
        sessionStorage.setItem('checkin_org_name', selectedOffice.org_name)
        sessionStorage.setItem('office_lat', selectedOffice.latitude.toString())
        sessionStorage.setItem('office_lng', selectedOffice.longitude.toString())

        router.push('/checkin')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      console.error('Select error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <LoadingSpinner message="กำลังตรวจสอบสิทธิ์..." />
  }

  if (!user) {
    return null // จะถูก redirect โดย useAuth
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* ข้อมูลผู้ใช้ */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ลงเวลาในนาม</p>
              <p className="text-lg font-semibold text-gray-800">{user.full_name}</p>
              <p className="text-sm text-gray-600">{user.org_name}</p>
              {user.thai_name && (
                <p className="text-xs text-blue-500 mt-1">ThaID: {user.thai_name} {user.birthdate && `(${user.birthdate})`}</p>
              )}
            </div>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* เลือกประเภทการลงเวลา */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          เลือกประเภทการลงเวลา
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* ปุ่ม OFFICE */}
          <button
            onClick={() => handleTypeSelect('OFFICE')}
            className={`card cursor-pointer transition-all hover:shadow-lg ${
              selectedType === 'OFFICE'
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                จากสำนักงาน
              </h3>
              <p className="text-sm text-gray-600">
                ลงเวลา ณ สำนักงานที่สังกัด
              </p>
              <p className="text-xs text-blue-600 mt-2">(OFFICE)</p>
            </div>
          </button>

          {/* ปุ่ม SUPPORT */}
          <button
            onClick={() => handleTypeSelect('SUPPORT')}
            className={`card cursor-pointer transition-all hover:shadow-lg ${
              selectedType === 'SUPPORT'
                ? 'ring-2 ring-green-500 bg-green-50'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                ช่วยปฏิบัติงาน
              </h3>
              <p className="text-sm text-gray-600">
                ลงเวลา ณ สำนักงานอื่นที่ไปช่วยงาน
              </p>
              <p className="text-xs text-green-600 mt-2">(SUPPORT)</p>
            </div>
          </button>
        </div>

        {/* Dropdown เลือกสังกัด (สำหรับ SUPPORT) */}
        {selectedType === 'SUPPORT' && (
          <div className="card mb-6">
            <OfficeSelector
              value={selectedOrgCode}
              onChange={handleOfficeSelect}
              error={error && !selectedOrgCode ? error : ''}
              disabled={loading}
            />
          </div>
        )}

        {/* แสดง error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* ปุ่มดำเนินการต่อ */}
        {selectedType && (
          <div className="text-center">
            <button
              onClick={handleProceed}
              disabled={loading || (selectedType === 'SUPPORT' && !selectedOrgCode)}
              className="btn-primary px-12 py-4 text-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังดำเนินการ...
                </span>
              ) : (
                'ดำเนินการต่อ'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
