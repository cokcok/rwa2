'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import OfficeSelector from '@/components/OfficeSelector'
import LoadingSpinner from '@/components/LoadingSpinner'
import { withBasePath } from '@/lib/config'
import { CHECKIN_TYPES, getTypeColorClasses, getEnabledTypes } from '@/config/checkin-types'
import type { CheckinType } from '@/config/checkin-types'
import type { OfficeLocation } from '@/types'

export default function SelectPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  const [selectedType, setSelectedType] = useState<CheckinType | null>(null)
  const [selectedOrgCode, setSelectedOrgCode] = useState('')
  const [selectedOffice, setSelectedOffice] = useState<OfficeLocation | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ถ้ายังไม่ได้ login จะถูก redirect โดย useAuth hook

  const handleTypeSelect = (type: CheckinType) => {
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
    if (!selectedType) return
    setError('')
    setLoading(true)

    const typeConfig = CHECKIN_TYPES[selectedType]

    try {
      if (typeConfig.skipLocationCheck) {
        // ไม่ต้องเช็คพิกัด (เช่น WFH)
        sessionStorage.setItem('checkin_type', selectedType)
        sessionStorage.setItem('checkin_org_code', user?.org_code || '')
        sessionStorage.setItem('checkin_org_name', user?.org_name || '')
        sessionStorage.removeItem('office_lat')
        sessionStorage.removeItem('office_lng')
        router.push('/checkin')
      } else if (!typeConfig.requiresOfficeSelect) {
        // ดึงพิกัดสำนักงานของพนักงาน
        const response = await fetch(withBasePath(`/api/offices/${user?.org_code}`))
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

        sessionStorage.setItem('checkin_type', selectedType)
        sessionStorage.setItem('checkin_org_code', user?.org_code || '')
        sessionStorage.setItem('checkin_org_name', user?.org_name || '')
        sessionStorage.setItem('office_lat', officeData.latitude.toString())
        sessionStorage.setItem('office_lng', officeData.longitude.toString())

        router.push('/checkin')
      } else {
        if (!selectedOrgCode || !selectedOffice) {
          setError('กรุณาเลือกสังกัด')
          return
        }

        let officeLat = selectedOffice.latitude
        let officeLng = selectedOffice.longitude

        // ถ้าหน่วยงานไม่มีพิกัด (เช่น หน่วยงานเพิ่มเติมจาก env) ให้ดึงจาก API
        if (officeLat === 0 && officeLng === 0) {
          try {
            const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
            const officeRes = await fetch(`${bp}/api/offices/${selectedOrgCode}`)
            if (officeRes.ok) {
              const officeData = await officeRes.json()
              officeLat = officeData.latitude
              officeLng = officeData.longitude
            }
          } catch {
            // ไม่สามารถดึงพิกัดได้ ใช้ค่าเดิม
          }
        }

        sessionStorage.setItem('checkin_type', selectedType)
        sessionStorage.setItem('checkin_org_code', selectedOrgCode)
        sessionStorage.setItem('checkin_org_name', selectedOffice.org_name)
        sessionStorage.setItem('office_lat', officeLat.toString())
        sessionStorage.setItem('office_lng', officeLng.toString())

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
              {/*user.thai_name && (
                <p className="text-xs text-blue-500 mt-1">ThaID: {user.thai_name} {user.birthdate && `(${user.birthdate})`}</p>
              )*/}
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
          {getEnabledTypes().map(([key, type]) => {
            const colors = getTypeColorClasses(type.color)
            return (
              <button
                key={key}
                onClick={() => handleTypeSelect(key)}
                className={`card cursor-pointer transition-all hover:shadow-lg ${
                  selectedType === key
                    ? `ring-2 ${colors.ring} ${colors.bg}`
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="text-center">
                  <div className={`w-16 h-16 ${colors.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <svg
                      className={`w-8 h-8 ${colors.iconText}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={type.iconPath}
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {type.label}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {type.description}
                  </p>
                  <p className={`text-xs ${colors.text} mt-2`}>({key})</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Dropdown เลือกสังกัด (สำหรับ type ที่ requiresOfficeSelect) */}
        {selectedType && CHECKIN_TYPES[selectedType].requiresOfficeSelect && (
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
              disabled={loading || (selectedType !== null && CHECKIN_TYPES[selectedType].requiresOfficeSelect && !selectedOrgCode)}
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
