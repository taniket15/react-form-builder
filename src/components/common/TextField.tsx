import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function TextField({ label, id, className = '', ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
      {label}
      <input
        id={inputId}
        {...props}
        className={`mt-1 block w-full rounded border border-slate-300 px-2 py-1 ${className}`}
      />
    </label>
  )
}
