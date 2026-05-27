'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LocationVerifier from '@/components/LocationVerifier'
import AttendanceButtons from '@/components/AttendanceButtons'
import ResultModal from '@/components/ResultModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import type { OfficeLocation, TodayRecord } from '@/types'

// สร้างลิงก์ Google Maps
function getGoogleMapsLink(lat: number, lng: number, label: string): string {
  return `https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(label)}`
}

// จัดรูปแบบพิกัด
function formatCoordinate(value: number): string {
  return value.toFixed(6)
}

export default function CheckinPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [checkinType, setCheckinType] = useState<'OFFICE' | 'SUPPORT'>('OFFICE')
  const [orgCode, setOrgCode] = useState('')
  const [orgName, setOrgName] = useState('')
  const [office, setOffice] = useState<OfficeLocation | null>(null)
  const [locationVerified, setLocationVerified] = useState(false)
  const [userLat, setUserLat] = useState(0)
  const [userLng, setUserLng] = useState(0)
  const [isWithinRange, setIsWithinRange] = useState(false)

  // Today records
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([])
  const [todayRecordsLoading, setTodayRecordsLoading] = useState(true)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalSuccess, setModalSuccess] = useState(false)
  const [modalActionType, setModalActionType] = useState<'IN' | 'OUT'>('IN')
  const [modalActionTime, setModalActionTime] = useState<string>('')
  const [modalDistance, setModalDistance] = useState(0)
  const [modalError, setModalError] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  const fetchTodayRecords = async () => {
    try {
      setTodayRecordsLoading(true)
      const response = await fetch('/api/attendance/today')
      console.log('[Today] Response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('[Today] Records count:', data.length, data)
        setTodayRecords(data)
      } else {
        const errData = await response.json()
        console.error('[Today] API error:', errData)
      }
    } catch (err) {
      console.error('[Today] Failed to fetch:', err)
    } finally {
      setTodayRecordsLoading(false)
    }
  }

  useEffect(() => {
    // ดึงข้อมูลจาก sessionStorage
    const storedType = sessionStorage.getItem('checkin_type')
    const storedOrgCode = sessionStorage.getItem('checkin_org_code')
    const storedOrgName = sessionStorage.getItem('checkin_org_name')
    const storedLat = sessionStorage.getItem('office_lat')
    const storedLng = sessionStorage.getItem('office_lng')

    if (!storedType || !storedOrgCode || !storedLat || !storedLng) {
      router.push('/select')
      return
    }

    setCheckinType(storedType as 'OFFICE' | 'SUPPORT')
    setOrgCode(storedOrgCode)
    setOrgName(storedOrgName || '')
    setOffice({
      org_code: storedOrgCode,
      org_name: storedOrgName || '',
      latitude: parseFloat(storedLat),
      longitude: parseFloat(storedLng)
    })

    fetchTodayRecords()
  }, [router])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLocationVerified = (lat: number, lng: number, _dist: number) => {
    setLocationVerified(true)
    setUserLat(lat)
    setUserLng(lng)
    setIsWithinRange(true)
  }

  const handleLocationError = (err: string) => {
    if (err.startsWith('OUT_OF_RANGE')) {
      setLocationVerified(false)
      setIsWithinRange(false)
    } else {
      setLocationVerified(false)
    }
    console.error('Location error:', err)
  }

  // รับพิกัดจาก LocationVerifier แม้ระยะเกิน
  const handleLocationObtained = (lat: number, lng: number, dist: number) => {
    setUserLat(lat)
    setUserLng(lng)
    setIsWithinRange(dist <= 200)
  }

  const handleCheckin = async (actionType: 'IN' | 'OUT') => {
    try {
      const response = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkin_type: checkinType,
          checkin_org_code: orgCode,
          action_type: actionType,
          user_lat: userLat,
          user_lng: userLng,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setModalSuccess(true)
        setModalActionType(actionType)
        setModalActionTime(data.action_time)
        setModalDistance(data.distance_meter)
        setModalError('')
        setModalMessage('')
        fetchTodayRecords()
      } else {
        setModalSuccess(false)
        setModalActionType(actionType)
        setModalActionTime('')
        setModalDistance(0)
        setModalError(data.error)
        setModalMessage(data.message)
      }
    } catch (err) {
      setModalSuccess(false)
      setModalActionType(actionType)
      setModalActionTime('')
      setModalDistance(0)
      setModalError('NETWORK_ERROR')
      setModalMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่')
      console.error('Checkin error:', err)
    }

    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    // ถ้าลงเวลาสำเร็จ กลับไปหน้า select
    if (modalSuccess) {
      router.push('/select')
    }
  }

  if (authLoading) {
    return <LoadingSpinner message="กำลังตรวจสอบสิทธิ์..." />
  }

  if (!user) {
    return null
  }

  if (!office) {
    return <LoadingSpinner message="กำลังโหลดข้อมูล..." />
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* ข้อมูลการลงเวลา */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              ลงเวลา{checkinType === 'OFFICE' ? 'จากสำนักงาน' : 'ช่วยปฏิบัติงาน'}
            </h2>
            <button
              onClick={() => router.push('/select')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              เปลี่ยนประเภท
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">ชื่อ:</span>
              <span className="font-medium">{user.full_name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">สังกัด:</span>
              <span className="font-medium">{user.org_name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">ลงเวลา ณ:</span>
              <span className="font-medium">{orgName}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">ประเภท:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                checkinType === 'OFFICE'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {checkinType === 'OFFICE' ? 'OFFICE' : 'SUPPORT'}
              </span>
            </div>
          </div>

          {/* รายการลงเวลาวันนี้ */}
          {!todayRecordsLoading && todayRecords.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                การลงเวลาในวันนี้
              </h4>
              <div className="space-y-2">
                {todayRecords.map((record, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        record.action_type === 'IN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {record.action_type === 'IN' ? 'เข้างาน' : 'ออกงาน'}
                      </span>
                      <span className="text-sm text-gray-600">{record.checkin_org_name}</span>
                    </div>
                    <span className="text-sm font-mono text-gray-500">
                      {new Date(record.action_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
              {todayRecords[todayRecords.length - 1].action_type === 'IN' && (
                <p className="mt-2 text-xs text-amber-600 text-center">
                  ⚠ ยังไม่ได้ลงเวลาออกงาน
                </p>
              )}
            </div>
          )}
        </div>

        {/* พิกัดสำนักงาน */}
        <div className="card mb-6 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            พิกัดสำนักงาน
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ละติจูด:</span>
              <span className="font-mono text-sm">{formatCoordinate(office.latitude)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ลองจิจูด:</span>
              <span className="font-mono text-sm">{formatCoordinate(office.longitude)}</span>
            </div>
            <a
              href={getGoogleMapsLink(office.latitude, office.longitude, orgName)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ดูพิกัดสำนักงานบน Google Maps
            </a>
          </div>
        </div>

        {/* ตรวจสอบพิกัด */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            ตรวจสอบตำแหน่ง
          </h3>
          <LocationVerifier
            office={office}
            onVerified={handleLocationVerified}
            onError={handleLocationError}
            onLocationObtained={handleLocationObtained}
          />
        </div>

        {/* ปุ่มลงเวลา (แสดงเมื่ออยู่ในรัศมี) */}
        {locationVerified && isWithinRange && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              เลือกรายการ
            </h3>
            <AttendanceButtons
              onCheckin={handleCheckin}
              disabled={false}
            />
          </div>
        )}

        {/* ปุ่มกลับ */}
        <div className="text-center">
          <button
            onClick={() => router.push('/select')}
            className="btn-secondary"
          >
            กลับไปเลือกประเภท
          </button>
        </div>
      </div>

      {/* Result Modal */}
      <ResultModal
        isOpen={showModal}
        onClose={handleCloseModal}
        success={modalSuccess}
        actionType={modalActionType}
        actionTime={modalActionTime}
        distance={modalDistance}
        error={modalError}
        message={modalMessage}
      />
    </div>
  )
}
