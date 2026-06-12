'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useServerTime } from '@/hooks/useServerTime'
import LocationVerifier from '@/components/LocationVerifier'
import AttendanceButtons from '@/components/AttendanceButtons'
import ResultModal from '@/components/ResultModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { CHECKIN_TYPES, getTypeColorClasses } from '@/config/checkin-types'
import type { CheckinType } from '@/config/checkin-types'
import type { OfficeLocation } from '@/types'
import { withBasePath } from '@/lib/config'

interface TodayRecord {
  log_id: number
  action_type: 'IN' | 'OUT'
  action_time: string
}

// สร้างลิงก์ Google Maps
function getGoogleMapsLink(lat: number, lng: number, label: string): string {
  return `https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(label)}`
}

// จัดรูปแบบพิกัด
function formatCoordinate(value: number): string {
  return value.toFixed(6)
}

// จัดรูปแบบเวลา
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}


export default function CheckinPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [checkinType, setCheckinType] = useState<CheckinType>('OFFICE')
  const [orgCode, setOrgCode] = useState('')
  const [orgName, setOrgName] = useState('')
  const [office, setOffice] = useState<OfficeLocation | null>(null)
  const [locationVerified, setLocationVerified] = useState(false)
  const [userLat, setUserLat] = useState(0)
  const [userLng, setUserLng] = useState(0)
  const [isWithinRange, setIsWithinRange] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [fetchingGps, setFetchingGps] = useState(false)
  const now = useServerTime()   // server time sync — ป้องกัน client clock manipulation

  const skipLocation = useMemo(() => {
    return CHECKIN_TYPES[checkinType]?.skipLocationCheck || process.env.NEXT_PUBLIC_SKIP_LOCATION === 'true' || process.env.NEXT_PUBLIC_SKIP_LOCATION === 'mock'
  }, [checkinType])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalSuccess, setModalSuccess] = useState(false)
  const [modalActionType, setModalActionType] = useState<'IN' | 'OUT'>('IN')
  const [modalActionTime, setModalActionTime] = useState<string>('')
  const [modalDistance, setModalDistance] = useState(0)
  const [modalError, setModalError] = useState('')
  const [modalMessage, setModalMessage] = useState('')

  useEffect(() => {
    // ดึงข้อมูลจาก sessionStorage
    const storedType = sessionStorage.getItem('checkin_type')
    const storedOrgCode = sessionStorage.getItem('checkin_org_code')
    const storedOrgName = sessionStorage.getItem('checkin_org_name')

    if (!storedType || !storedOrgCode) {
      router.push('/select')
      return
    }

    const isSkip = CHECKIN_TYPES[storedType as CheckinType]?.skipLocationCheck || false
    const storedLat = sessionStorage.getItem('office_lat')
    const storedLng = sessionStorage.getItem('office_lng')

    if (!isSkip && (!storedLat || !storedLng)) {
      router.push('/select')
      return
    }

    setCheckinType(storedType as CheckinType)
    setOrgCode(storedOrgCode)
    setOrgName(storedOrgName || '')
    if (storedLat && storedLng) {
      setOffice({
        org_code: storedOrgCode,
        org_name: storedOrgName || '',
        latitude: parseFloat(storedLat),
        longitude: parseFloat(storedLng)
      })
    }
  }, [router])

  const fetchTodayRecords = useCallback(async () => {
    try {
      setLoadingRecords(true)
      const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${bp}/api/attendance/today`)
      if (response.ok) {
        const data = await response.json()
        setTodayRecords(data.records || [])
      }
    } catch (err) {
      console.error('Fetch today records error:', err)
    } finally {
      setLoadingRecords(false)
    }
  }, [])

  useEffect(() => {
    fetchTodayRecords()
  }, [fetchTodayRecords])

  useEffect(() => {
    if (skipLocation) {
      setLocationVerified(true)
      setIsWithinRange(true)
      // ดึง GPS เก็บไว้ (ไม่เช็คระยะ)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLat(pos.coords.latitude)
            setUserLng(pos.coords.longitude)
          },
          () => { /* ไม่ได้ GPS ก็ไม่เป็นไร */ },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      }
    }
  }, [skipLocation])

  // [ลบ inline clock sync] — ย้ายไปใช้ useServerTime hook แทน
  // hook จัดการ: initial sync + tick ทุก 1 วิ + re-sync ทุก 60 วิ + cleanup

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLocationVerified = (lat: number, lng: number, _dist: number) => {
    setLocationVerified(true)
    setUserLat(lat)
    setUserLng(lng)
    setIsWithinRange(true)
    setLocationError('')
  }

  const handleLocationError = (err: string) => {
    if (err.startsWith('OUT_OF_RANGE')) {
      setLocationVerified(false)
      setIsWithinRange(false)
      const distStr = err.replace('OUT_OF_RANGE: ', '').replace(' เมตร', '')
      const dist = parseFloat(distStr)
      const maxDist = parseFloat(process.env.NEXT_PUBLIC_MAX_DISTANCE_METERS || '50')
      setLocationError(`คุณอยู่ห่างจากสำนักงาน ${dist.toFixed(1)} เมตร (ต้องไม่เกิน ${maxDist.toFixed(0)} เมตร)`)
    } else {
      setLocationVerified(false)
      setLocationError(err)
    }
    console.error('Location error:', err)
  }

  // รับพิกัดจาก LocationVerifier แม้ระยะเกิน
  const handleLocationObtained = (lat: number, lng: number, dist: number) => {
    setUserLat(lat)
    setUserLng(lng)
    const maxDist = parseFloat(process.env.NEXT_PUBLIC_MAX_DISTANCE_METERS || '50')
    const inRange = dist <= maxDist
    setIsWithinRange(inRange)
    if (inRange) {
      setLocationError('')
    }
  }

  const handleCheckin = async (actionType: 'IN' | 'OUT') => {
    try {
      // ถ้ายังไม่ได้ GPS ให้ดึงตอนนี้เลย
      let lat = userLat
      let lng = userLng
      if (lat === 0 && lng === 0 && navigator.geolocation) {
        try {
          setFetchingGps(true)
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
          setUserLat(lat)
          setUserLng(lng)
        } catch {
          // ไม่ได้ GPS ส่ง 0 ไป
        } finally {
          setFetchingGps(false)
        }
      }

      const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${bp}/api/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkin_type: checkinType,
          checkin_org_code: orgCode,
          action_type: actionType,
          user_lat: lat,
          user_lng: lng,
          client_timestamp: Date.now(),
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
  }

  if (authLoading) {
    return <LoadingSpinner message="กำลังตรวจสอบสิทธิ์..." />
  }

  if (!user) {
    return null
  }

  if (!skipLocation && !office) {
    return <LoadingSpinner message="กำลังโหลดข้อมูล..." />
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-start justify-center p-4">
      <div className="max-w-lg w-full">
        {/* หัวเรื่อง + วันที่/เวลา + ปุ่มเข้าออก — อยู่ด้านบนสุด */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-800">
              ลงเวลา{CHECKIN_TYPES[checkinType]?.label || ''}
            </h2>
            <button
              onClick={() => router.push('/select')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              เปลี่ยนประเภท
            </button>
          </div>

          {/* วันที่และเวลา realtime */}
          <div className="text-center mb-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            {now ? (
              <>
                <div className="text-lg font-semibold text-gray-800">
                  {now.toLocaleDateString('th-TH', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-3xl font-bold text-blue-700 font-mono tracking-wider mt-1">
                  {now.toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </>
            ) : (
              <div className="text-gray-500">กำลังซิงค์เวลา...</div>
            )}
          </div>

          {/* ปุ่มลงเวลา — แสดงด้านบน กดได้ทันที */}
          {(skipLocation || (locationVerified && isWithinRange)) ? (
            <div className="mb-2">
              <AttendanceButtons
                onCheckin={handleCheckin}
                disabled={false}
                fetchingGps={fetchingGps}
              />
            </div>
          ) : !skipLocation && !locationVerified && !locationError ? (
            <div className="mb-2 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-blue-700 font-medium">กำลังตรวจสอบพิกัด...</p>
              <p className="text-sm text-blue-500 mt-1">กรุณารอสักครู่ ระบบกำลังตรวจสอบตำแหน่งของคุณ</p>
            </div>
          ) : null}

          {/* แจ้งเตือนอยู่นอกรัศมี — แสดงตำแหน่งเดียวกับปุ่ม */}
          {locationError && (
            <div className="mb-2 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-red-700 font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {locationError}
              </div>
            </div>
          )}
        </div>

        {/* ข้อมูลผู้ใช้และประวัติวันนี้ */}
        <div className="card mb-6">
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
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">ประเภท:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                getTypeColorClasses(CHECKIN_TYPES[checkinType]?.color || 'blue').iconBg
              } ${getTypeColorClasses(CHECKIN_TYPES[checkinType]?.color || 'blue').iconText}`}>
                {checkinType}
              </span>
            </div>

            {/* ข้อมูลการลงเวลาวันนี้ */}
            <div className="pt-2 mt-2 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ข้อมูลการลงเวลาวันนี้
              </h3>
              {loadingRecords ? (
                <div className="text-center py-3 text-gray-500 text-sm">กำลังโหลดข้อมูล...</div>
              ) : todayRecords.length === 0 ? (
                <div className="text-center py-3 text-gray-500 text-sm">ยังไม่มีการลงเวลาวันนี้</div>
              ) : (
                <div className="space-y-2">
                  {todayRecords.map((record, index) => (
                    <div key={record.log_id} className="flex justify-between items-center py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          record.action_type === 'IN'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {record.action_type === 'IN' ? 'เข้างาน' : 'ออกงาน'}
                        </span>
                        <span className="text-gray-400 text-xs">#{index + 1}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-medium text-gray-800">
                          {formatTime(record.action_time)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* พิกัดสำนักงาน + ตรวจสอบตำแหน่ง */}
        {!skipLocation && office && (
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

            {/* ตรวจสอบพิกัด */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h3 className="text-base font-semibold text-blue-800 mb-3 text-center">
                ตรวจสอบตำแหน่ง
              </h3>
              <LocationVerifier
                office={office}
                onVerified={handleLocationVerified}
                onError={handleLocationError}
                onLocationObtained={handleLocationObtained}
                hideRangeError={true}
              />
            </div>
          </div>
        )}

        {/* ปุ่มกลับ + รายงาน */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => router.push('/select')}
            className="btn-secondary"
          >
            กลับไปเลือกประเภท
          </button>
          {/* ปุ่มดูรายงาน - ปิดไว้ชั่วคราว */}
          {/* <a
            href={withBasePath('/report')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            ดูรายงาน
          </a> */}
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
