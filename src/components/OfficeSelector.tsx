'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchOffices()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  const filteredOffices = offices.filter(office => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      office.org_code.toLowerCase().includes(query) ||
      office.org_name.toLowerCase().includes(query)
    )
  })

  const handleSelect = (office: OfficeLocation) => {
    onChange(office.org_code, office)
    setSearchQuery('')
    setIsDropdownOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setIsDropdownOpen(true)
    if (value) {
      onChange('', null)
    }
  }

  const handleInputFocus = () => {
    setIsDropdownOpen(true)
  }

  const selectedOffice = offices.find(o => o.org_code === value)

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
    <div ref={containerRef} className="w-full relative">
      <label htmlFor="office-select" className="block text-sm font-medium text-gray-700 mb-2">
        เลือกสังกัด
      </label>
      <div className="relative">
        <input
          id="office-select"
          type="text"
          value={selectedOffice ? `${selectedOffice.org_code} - ${selectedOffice.org_name}` : searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onClick={() => setIsDropdownOpen(true)}
          disabled={disabled}
          placeholder="-- ค้นหาสังกัด --"
          className={`input-field w-full pr-10 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        <button
          type="button"
          onClick={() => {
            if (selectedOffice) {
              onChange('', null)
              setSearchQuery('')
            }
            setIsDropdownOpen(!isDropdownOpen)
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg
            className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOffices.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">ไม่พบผลลัพธ์</div>
          ) : (
            filteredOffices.map((office) => (
              <button
                key={office.org_code}
                type="button"
                onClick={() => handleSelect(office)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${
                  value === office.org_code ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                }`}
              >
                {office.org_code} - {office.org_name}
              </button>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="error-message mt-2">{error}</p>
      )}
    </div>
  )
}
