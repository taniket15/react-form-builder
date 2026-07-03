import type { DateConfig } from '../types'
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

function ConfigPanel({ config, onChange }: FieldConfigPanelProps<DateConfig>) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Label
        <input
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
          value={config.label}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={config.required}
          onChange={(e) => onChange({ ...config, required: e.target.checked })}
        />
        Required
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={config.prefillToday}
          onChange={(e) => onChange({ ...config, prefillToday: e.target.checked })}
        />
        Pre-fill with today's date
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">
          Min date
          <input
            type="date"
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
            value={config.minDate ?? ''}
            onChange={(e) => onChange({ ...config, minDate: e.target.value || undefined })}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Max date
          <input
            type="date"
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
            value={config.maxDate ?? ''}
            onChange={(e) => onChange({ ...config, maxDate: e.target.value || undefined })}
          />
        </label>
      </div>
    </div>
  )
}

function FillField({ config, value, onChange, error }: FieldFillProps<DateConfig, Value>) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {config.label}
        {config.required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type="date"
        className="mt-1 block rounded border border-slate-300 px-2 py-1"
        min={config.minDate}
        max={config.maxDate}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
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
