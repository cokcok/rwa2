'use client'

import { useState } from 'react'

interface DbTestResult {
  status: string
  message: string
  use_mock_data?: boolean
  oracle_mode?: string
  oracle_client_path?: string
  test_query?: string | number
  error?: string
}

export default function TestDbPage() {
  const [result, setResult] = useState<DbTestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    setResult(null)

    try {
      const bp = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const res = await fetch(`${bp}/api/test-db`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({
        status: 'error',
        message: 'ไม่สามารถเชื่อมต่อ API ได้',
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-700 bg-green-50 border-green-200'
      case 'mock': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'error': return 'text-red-700 bg-red-50 border-red-200'
      default: return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'เชื่อมต่อสำเร็จ'
      case 'mock': return 'Mock Mode'
      case 'error': return 'เชื่อมต่อไม่สำเร็จ'
      default: return status
    }
  }

  return (
    <div className="min-h-[calc(100vh-180px)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
            ทดสอบเชื่อมต่อ Database
          </h1>
          <p className="text-gray-500 text-center mb-6 text-sm">
            ทดสอบการเชื่อมต่อ Oracle DB ผ่าน API
          </p>

          <button
            onClick={testConnection}
            disabled={loading}
            className="btn-primary w-full mb-6"
          >
            {loading ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
          </button>

          {result && (
            <div className={`border rounded-lg p-4 ${statusColor(result.status)}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${
                  result.status === 'connected' ? 'bg-green-500' :
                  result.status === 'mock' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="font-semibold text-lg">{statusLabel(result.status)}</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-70">ข้อความ:</span>
                  <span className="font-medium">{result.message}</span>
                </div>

                {result.use_mock_data !== undefined && (
                  <div className="flex justify-between">
                    <span className="opacity-70">Mock Data:</span>
                    <span className="font-medium">{result.use_mock_data ? 'เปิด' : 'ปิด'}</span>
                  </div>
                )}

                {result.oracle_mode && (
                  <div className="flex justify-between">
                    <span className="opacity-70">Oracle Mode:</span>
                    <span className="font-medium">{result.oracle_mode}</span>
                  </div>
                )}

                {result.oracle_client_path && (
                  <div className="flex justify-between">
                    <span className="opacity-70">Client Path:</span>
                    <span className="font-medium font-mono text-xs">{result.oracle_client_path}</span>
                  </div>
                )}

                {result.test_query !== undefined && (
                  <div className="flex justify-between">
                    <span className="opacity-70">Test Query:</span>
                    <span className="font-medium font-mono">{String(result.test_query)}</span>
                  </div>
                )}

                {result.error && (
                  <div className="mt-3 p-3 bg-red-100 rounded border border-red-200">
                    <span className="text-red-800 text-xs font-mono break-all">{result.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
