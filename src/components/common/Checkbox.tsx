import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Checkbox({ label, id, ...props }: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input id={inputId} type="checkbox" {...props} />
      {label}
    </label>
  )
}
