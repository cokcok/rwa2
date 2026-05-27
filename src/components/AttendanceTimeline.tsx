'use client'

import type { TodayRecord } from '@/types'

interface AttendanceTimelineProps {
  records: TodayRecord[]
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export default function AttendanceTimeline({ records }: AttendanceTimelineProps) {
  if (records.length === 0) return null

  const lastAction = records[records.length - 1].action_type

  return (
    <div className="card mb-6 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          การลงเวลาวันนี้
        </h3>
        <span className="text-xs text-gray-400">{records.length} รายการ</span>
      </div>

      <div className="relative">
        {records.map((record, index) => (
          <div key={index} className="flex items-start gap-3 pb-4 last:pb-0">
            {/* Timeline line & dot */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full ring-2 ring-white ${
                record.action_type === 'IN'
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }`} />
              {index < records.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  record.action_type === 'IN'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {record.action_type === 'IN' ? 'เข้างาน' : 'ออกงาน'}
                </span>
                <span className="text-sm font-mono text-gray-500">
                  {formatTime(record.action_time)}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-0.5">
                {record.checkin_org_name}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {record.checkin_type === 'SUPPORT' ? 'ช่วยปฏิบัติงาน' : 'สำนักงาน'} · ระยะ {record.distance_meter.toFixed(1)} ม.
              </div>
            </div>
          </div>
        ))}
      </div>

      {lastAction === 'IN' && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-center">
          <span className="text-sm text-amber-600 font-medium">
            ⚠ ขณะนี้คุณลงเวลาเข้างานแล้ว อย่าลืมลงเวลาออกงาน
          </span>
        </div>
      )}
    </div>
  )
}
