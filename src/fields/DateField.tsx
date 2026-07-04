import { useId } from 'react'
import type { DateConfig } from '../types'
import { TextField } from '../components/common/TextField'
import { Checkbox } from '../components/common/Checkbox'
import { Badge } from '../components/common/Badge'
import { LabelRequiredFields } from './configPanelFields'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

// ISO "YYYY-MM-DD" (matches <input type="date">) — string comparison is valid for
// equals/isBefore/isAfter and min/max bounds as long as everything stays this format.
type Value = string

function todayISODate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createDefaultConfig(): DateConfig {
  return {
    type: 'date',
    label: 'Date',
    required: false,
    prefillToday: false,
  }
}

function ConfigPanel({ config, onChange, ctx }: FieldConfigPanelProps<DateConfig>) {
  return (
    <div className="space-y-3">
      <LabelRequiredFields config={config} onChange={onChange} labelError={ctx.labelError} />
      <Checkbox
        label="Pre-fill with today's date"
        checked={config.prefillToday}
        onChange={(e) => onChange({ ...config, prefillToday: e.target.checked })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Min date"
          type="date"
          value={config.minDate ?? ''}
          onChange={(e) => onChange({ ...config, minDate: e.target.value || undefined })}
        />
        <TextField
          label="Max date"
          type="date"
          value={config.maxDate ?? ''}
          onChange={(e) => onChange({ ...config, maxDate: e.target.value || undefined })}
        />
      </div>
    </div>
  )
}

function FillField({ config, value, onChange, error }: FieldFillProps<DateConfig, Value>) {
  const inputId = useId()
  return (
    <div>
      <label htmlFor={inputId} className="field-label flex items-center gap-2">
        <span>
          {config.label}
          {config.required && <span className="field-required-mark"> *</span>}
        </span>
        {config.prefillToday && <Badge variant="today">Today</Badge>}
      </label>
      <input
        id={inputId}
        type="date"
        className="field-input mt-1 block w-auto"
        min={config.minDate}
        max={config.maxDate}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function validate(value: Value, config: DateConfig): string | null {
  if (value === '') {
    return config.required ? `${config.label} is required` : null
  }
  if (config.minDate !== undefined && value < config.minDate) {
    return `${config.label} must be on or after ${config.minDate}`
  }
  if (config.maxDate !== undefined && value > config.maxDate) {
    return `${config.label} must be on or before ${config.maxDate}`
  }
  return null
}

export const dateDefinition: FieldDefinition<DateConfig, Value> = {
  type: 'date',
  label: 'Date',
  icon: '📅',
  createDefaultConfig,
  ConfigPanel,
  FillField,
  getInitialValue: (config) => (config.prefillToday ? todayISODate() : ''),
  validate,
  conditionOperators: [
    { operator: 'equals', label: 'equals' },
    { operator: 'isBefore', label: 'is before' },
    { operator: 'isAfter', label: 'is after' },
  ],
  evaluateCondition: (operator, targetValue, compareValue) => {
    if (targetValue === '') return false
    const compare = typeof compareValue === 'string' ? compareValue : ''
    if (compare === '') return false
    switch (operator) {
      case 'equals':
        return targetValue === compare
      case 'isBefore':
        return targetValue < compare
      case 'isAfter':
        return targetValue > compare
      default:
        return false
    }
  },
  formatForDisplay: (value) => {
    if (value === '') return ''
    const parts = value.split('-').map(Number)
    const year = parts[0]
    const month = parts[1]
    const day = parts[2]
    if (year === undefined || month === undefined || day === undefined) return value
    return new Date(year, month - 1, day).toLocaleDateString()
  },
}

registerField(dateDefinition)
