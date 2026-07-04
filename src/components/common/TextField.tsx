import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({ label, id, className = '', error, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <input
        id={inputId}
        {...props}
        aria-invalid={!!error}
        className={`field-input mt-1 ${className}`}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
