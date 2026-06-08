'use client'

interface ResultModalProps {
  isOpen: boolean
  onClose: () => void
  success: boolean
  actionType: 'IN' | 'OUT'
  actionTime?: string
  distance?: number
  error?: string
  message?: string
}

export default function ResultModal({
  isOpen,
  onClose,
  success,
  actionType,
  actionTime,
  distance,
  error,
  message
}: ResultModalProps) {
  if (!isOpen) return null

  const actionLabel = actionType === 'IN' ? 'เข้างาน' : 'ออกงาน'
  const formattedTime = actionTime
    ? new Date(actionTime).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : ''

  const isSuccessOut = success && actionType === 'OUT'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center ${success ? (isSuccessOut ? 'bg-red-50' : 'bg-green-50') : 'bg-red-50'}`}>
          {success ? (
            <svg
              className={`w-16 h-16 mx-auto mb-4 ${isSuccessOut ? 'text-red-500' : 'text-green-500'}`}
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
          ) : (
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <h3 className={`text-xl font-semibold ${success ? (isSuccessOut ? 'text-red-800' : 'text-green-800') : 'text-red-800'}`}>
            {success ? `ลงเวลา${actionLabel}สำเร็จ` : `ลงเวลา${actionLabel}ไม่สำเร็จ`}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">ประเภท:</span>
                <span className="font-medium">{actionLabel}</span>
              </div>
              {formattedTime && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">เวลา:</span>
                  <span className="font-medium">{formattedTime}</span>
                </div>
              )}
              {distance !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">ระยะห่าง:</span>
                  <span className="font-medium">
                    {distance < 1000
                      ? `${distance.toFixed(1)} เมตร`
                      : `${(distance / 1000).toFixed(2)} กิโลเมตร`}
                  </span>
                </div>
              )}
              {message && (
                <p className="text-sm text-gray-500 mt-4 text-center">{message}</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-red-600 mb-2">{message || error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 flex justify-center">
          <button onClick={onClose} className={`px-8 py-2 rounded-lg text-white font-medium transition-colors ${isSuccessOut ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
            ตกลง
          </button>
        </div>
      </div>
    </div>
  )
}
