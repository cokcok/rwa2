'use client'

import { useState, useEffect } from 'react'
import { calculateDistance, formatDistance } from '@/lib/geolocation'
import type { OfficeLocation } from '@/types'

interface LocationVerifierProps {
  office: OfficeLocation
  onVerified: (userLat: number, userLng: number, distance: number) => void
  onError: (error: string) => void
  onLocationObtained?: (userLat: number, userLng: number, distance: number) => void
}

export default function LocationVerifier({ office, onVerified, onError, onLocationObtained }: LocationVerifierProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [distance, setDistance] = useState<number | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    verifyLocation()
  }, [])

  const verifyLocation = () => {
    setLoading(true)
    setError('')

    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
      onError('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
      setLoading(false)
      return
    }

    // ใช้ setTimeout 10 วินาที (แก้จาก requestAnimationFrame ที่ไม่ถูกต้อง)
    const timeout = setTimeout(() => {
      setError('หมดเวลาในการระบุตำแหน่ง กรุณาลองใหม่')
      onError('GEOLOCATION_TIMEOUT')
      setLoading(false)
    }, 10000)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout)
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })

        // คำนวณระยะห่าง
        const dist = calculateDistance(latitude, longitude, office.latitude, office.longitude)
        setDistance(dist)

        // ส่งพิกัดกลับเสมอ (ไม่ว่าจะอยู่ในรัศมีหรือไม่)
        if (onLocationObtained) {
          onLocationObtained(latitude, longitude, dist)
        }

        const maxDistance = 50 // เมตร
        if (dist > maxDistance) {
          setError(`คุณอยู่ห่างจากสำนักงาน ${formatDistance(dist)} (ต้องไม่เกิน ${maxDistance} เมตร)`)
          onError(`OUT_OF_RANGE: ${dist} เมตร`)
        } else {
          onVerified(latitude, longitude, dist)
        }

        setLoading(false)
      },
      (err) => {
        clearTimeout(timeout)
        let errorMessage = 'ไม่สามารถระบุตำแหน่งได้'

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'กรุณาอนุญาตให้เข้าถึงตำแหน่งในเบราว์เซอร์'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'ไม่สามารถระบุตำแหน่งได้ กรุณาตรวจสอบ GPS'
            break
          case err.TIMEOUT:
            errorMessage = 'หมดเวลาในการระบุตำแหน่ง กรุณาลองใหม่'
            break
        }

        setError(errorMessage)
        onError(errorMessage)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // สร้างลิงก์ Google Maps
  const getGoogleMapsLink = (lat: number, lng: number, label: string) => {
    return `https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(label)}`
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบตำแหน่ง...</p>
          <p className="text-sm text-gray-400 mt-2">กรุณารอสักครู่</p>
        </div>
      </div>
    )
  }

  // แสดงพิกัดตัวเองเสมอ (ไม่ว่าจะอยู่ในรัศมีหรือไม่)
  if (userLocation) {
    return (
      <div className={`card ${error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        {/* สถานะ */}
        <div className="text-center mb-4">
          {error ? (
            <>
              <svg
                className="w-12 h-12 text-red-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <p className="text-red-600 font-medium mb-2">{error}</p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-green-500 mx-auto mb-4"
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
              <p className="text-green-600 font-medium mb-2">ตรวจสอบตำแหน่งสำเร็จ</p>
            </>
          )}
        </div>

        {/* ข้อมูลพิกัด */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">ละติจูด:</span>
            <span className="font-mono text-sm">{userLocation.lat.toFixed(6)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">ลองจิจูด:</span>
            <span className="font-mono text-sm">{userLocation.lng.toFixed(6)}</span>
          </div>
          {distance !== null && (
            <div className="flex justify-between items-center py-2 border-t border-gray-200 mt-2">
              <span className="text-gray-600">ระยะห่าง:</span>
              <span className={`font-medium ${distance <= 50 ? 'text-green-600' : 'text-red-600'}`}>
                {formatDistance(distance)}
              </span>
            </div>
          )}
        </div>

        {/* ปุ่มดูบน Google Maps */}
        <a
          href={getGoogleMapsLink(userLocation.lat, userLocation.lng, 'ตำแหน่งของคุณ')}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg transition-colors text-sm ${
            error
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          ดูพิกัดของคุณบน Google Maps
        </a>

        {/* ปุ่มลองใหม่ (เมื่ออยู่นอกพื้นที่) */}
        {error && (
          <button onClick={verifyLocation} className="btn-primary w-full mt-3">
            ลองใหม่
          </button>
        )}
      </div>
    )
  }

  // กรณีไม่สามารถระบุตำแหน่งได้
  return (
    <div className="card border-red-200 bg-red-50">
      <div className="text-center">
        <svg
          className="w-12 h-12 text-red-500 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button onClick={verifyLocation} className="btn-primary">
          ลองใหม่
        </button>
      </div>
    </div>
  )
}
