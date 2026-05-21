'use client'

import { useState, useEffect } from 'react'
import type { OfficeLocation } from '@/types'

interface OfficeSelectorProps {
  value: string
  onChange: (orgCode: string, office: OfficeLocation | null) => void
  error?: string
  disabled?: boolean
}

export default function OfficeSelector({ value, onChange, error, disabled }: OfficeSelectorProps) {
  const [offices, setOffices] = useState<OfficeLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string>('')

  useEffect(() => {
    fetchOffices()
  }, [])

  const fetchOffices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/offices')
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลสังกัดได้')
      }
      const data = await response.json()
      setOffices(data)
    } catch (err) {
      setFetchError('ไม่สามารถดึงข้อมูลสังกัดได้ กรุณาลองใหม่อีกครั้ง')
      console.error('Fetch offices error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgCode = e.target.value
    const selectedOffice = offices.find(o => o.org_code === orgCode) || null
    onChange(orgCode, selectedOffice)
  }

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          เลือกสังกัด
        </label>
        <div className="input-field bg-gray-50 animate-pulse">
          กำลังโหลดข้อมูลสังกัด...
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          เลือกสังกัด
        </label>
        <div className="input-field bg-red-50 border-red-300 text-red-600">
          {fetchError}
        </div>
        <button
          onClick={fetchOffices}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
        >
          ลองใหม่
        </button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <label htmlFor="office-select" className="block text-sm font-medium text-gray-700 mb-2">
        เลือกสังกัด
      </label>
      <select
        id="office-select"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`input-field ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
      >
        <option value="">-- เลือกสังกัด --</option>
        {offices.map((office) => (
          <option key={office.org_code} value={office.org_code}>
            {office.org_code} - {office.org_name}
          </option>
        ))}
      </select>
      {error && (
        <p className="error-message mt-2">{error}</p>
      )}
      {value && (
        <p className="text-sm text-gray-500 mt-2">
          {offices.find(o => o.org_code === value)?.org_name}
        </p>
      )}
    </div>
  )
}
