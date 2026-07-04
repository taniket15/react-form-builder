import { TextField } from '../components/common/TextField'
import { Checkbox } from '../components/common/Checkbox'
import type { ConditionOperator } from '../types'

export function validateTextLength(
  value: string,
  config: { label: string; required: boolean; minLength?: number; maxLength?: number },
): string | null {
  if (config.required && value.trim() === '') return `${config.label} is required`
  if (config.minLength !== undefined && value.length < config.minLength) {
    return `${config.label} must be at least ${config.minLength} characters`
  }
  if (config.maxLength !== undefined && value.length > config.maxLength) {
    return `${config.label} must be at most ${config.maxLength} characters`
  }
  return null
}

export function evaluateStringEqualsContains(
  operator: ConditionOperator,
  targetValue: string,
  compareValue: unknown,
): boolean {
  const compare = typeof compareValue === 'string' ? compareValue : ''
  switch (operator) {
    case 'equals':
      return targetValue === compare
    case 'notEquals':
      return targetValue !== compare
    case 'contains':
      return targetValue.includes(compare)
    default:
      return false
  }
}

export function TextLengthConfigFields<
  C extends {
    label: string
    placeholder?: string
    required: boolean
    minLength?: number
    maxLength?: number
  },
>({
  config,
  onChange,
  labelError,
}: {
  config: C
  onChange: (config: C) => void
  labelError?: string
}) {
  return (
    <>
      <TextField
        label="Label"
        value={config.label}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
        error={labelError}
      />
      <TextField
        label="Placeholder"
        value={config.placeholder ?? ''}
        onChange={(e) => onChange({ ...config, placeholder: e.target.value })}
      />
      <Checkbox
        label="Required"
        checked={config.required}
        onChange={(e) => onChange({ ...config, required: e.target.checked })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Min length"
          type="number"
          value={config.minLength ?? ''}
          onChange={(e) =>
            onChange({
              ...config,
              minLength: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
        <TextField
          label="Max length"
          type="number"
          value={config.maxLength ?? ''}
          onChange={(e) =>
            onChange({
              ...config,
              maxLength: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
      </div>
    </>
  )
}
