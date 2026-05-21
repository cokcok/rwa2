'use client'

interface ThaiIdInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export default function ThaiIdInput({ value, onChange, error, disabled }: ThaiIdInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/\D/g, '').slice(0, 13)
    onChange(newValue)
  }

  return (
    <div className="w-full">
      <label htmlFor="national-id" className="block text-sm font-medium text-gray-700 mb-2">
        เลขบัตรประชาชน
      </label>
      <input
        id="national-id"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={13}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="กรอกเลขบัตรประชาชน 13 หลัก"
        className={`input-field ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        autoComplete="off"
      />
      {error && (
        <p className="error-message mt-2">{error}</p>
      )}
    </div>
  )
}
