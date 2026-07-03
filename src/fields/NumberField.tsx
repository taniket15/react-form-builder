import { useId } from 'react'
import type { NumberConfig, RangeValue } from '../types'
import { TextField } from '../components/common/TextField'
import { Checkbox } from '../components/common/Checkbox'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

// Value is stored as `string`, not `number`, so intermediate typing states like
// "-", "3.", or "" aren't coerced away mid-entry. parseNumber is the single place
// raw text becomes a real number — used here and later by computeCalculations.
type Value = string

export function parseNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function countDecimals(raw: string): number {
  const idx = raw.indexOf('.')
  return idx === -1 ? 0 : raw.length - idx - 1
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseNumber(value)
  return null
}

function isRangeValue(value: unknown): value is RangeValue {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return typeof obj.min === 'number' && typeof obj.max === 'number'
}

function createDefaultConfig(): NumberConfig {
  return {
    type: 'number',
    label: 'Number',
    required: false,
    decimalPlaces: 0,
  }
}

function ConfigPanel({ config, onChange }: FieldConfigPanelProps<NumberConfig>) {
  return (
    <div className="space-y-3">
      <TextField
        label="Label"
        value={config.label}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
      />
      <Checkbox
        label="Required"
        checked={config.required}
        onChange={(e) => onChange({ ...config, required: e.target.checked })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Min value"
          type="number"
          value={config.min ?? ''}
          onChange={(e) =>
            onChange({ ...config, min: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
        <TextField
          label="Max value"
          type="number"
          value={config.max ?? ''}
          onChange={(e) =>
            onChange({ ...config, max: e.target.value === '' ? undefined : Number(e.target.value) })
          }
        />
      </div>
      <TextField
        label="Decimal places (0–4)"
        type="number"
        min={0}
        max={4}
        value={config.decimalPlaces}
        onChange={(e) =>
          onChange({
            ...config,
            decimalPlaces: Math.min(4, Math.max(0, Number(e.target.value) || 0)),
          })
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Prefix"
          value={config.prefix ?? ''}
          onChange={(e) => onChange({ ...config, prefix: e.target.value })}
        />
        <TextField
          label="Suffix"
          value={config.suffix ?? ''}
          onChange={(e) => onChange({ ...config, suffix: e.target.value })}
        />
      </div>
    </div>
  )
}

function FillField({ config, value, onChange, error }: FieldFillProps<NumberConfig, Value>) {
  const inputId = useId()
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {config.label}
        {config.required && <span className="text-red-500"> *</span>}
      </label>
      <div className="mt-1 flex items-stretch">
        {config.prefix && (
          <span className="flex items-center rounded-l border border-r-0 border-slate-300 bg-slate-50 px-2 text-sm text-slate-500">
            {config.prefix}
          </span>
        )}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          className={`block w-full border border-slate-300 px-2 py-1 ${config.prefix ? '' : 'rounded-l'} ${
            config.suffix ? '' : 'rounded-r'
          }`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
        {config.suffix && (
          <span className="flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-2 text-sm text-slate-500">
            {config.suffix}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

function validate(value: Value, config: NumberConfig): string | null {
  if (value.trim() === '') {
    return config.required ? `${config.label} is required` : null
  }
  const n = parseNumber(value)
  if (n === null) return `${config.label} must be a valid number`
  if (config.min !== undefined && n < config.min) return `${config.label} must be at least ${config.min}`
  if (config.max !== undefined && n > config.max) return `${config.label} must be at most ${config.max}`
  if (countDecimals(value) > config.decimalPlaces) {
    return `${config.label} allows at most ${config.decimalPlaces} decimal place(s)`
  }
  return null
}

export const numberDefinition: FieldDefinition<NumberConfig, Value> = {
  type: 'number',
  label: 'Number',
  icon: '🔢',
  createDefaultConfig,
  ConfigPanel,
  FillField,
  getInitialValue: () => '',
  validate,
  conditionOperators: [
    { operator: 'equals', label: 'equals' },
    { operator: 'greaterThan', label: 'is greater than' },
    { operator: 'lessThan', label: 'is less than' },
    { operator: 'withinRange', label: 'is within range' },
  ],
  evaluateCondition: (operator, targetValue, compareValue) => {
    const targetNum = parseNumber(targetValue)
    if (targetNum === null) return false
    if (operator === 'withinRange') {
      return isRangeValue(compareValue) && targetNum >= compareValue.min && targetNum <= compareValue.max
    }
    const compareNum = toComparableNumber(compareValue)
    if (compareNum === null) return false
    switch (operator) {
      case 'equals':
        return targetNum === compareNum
      case 'greaterThan':
        return targetNum > compareNum
      case 'lessThan':
        return targetNum < compareNum
      default:
        return false
    }
  },
  formatForDisplay: (value, config) => {
    const n = parseNumber(value)
    if (n === null) return ''
    return `${config.prefix ?? ''}${n.toFixed(config.decimalPlaces)}${config.suffix ?? ''}`
  },
}

registerField(numberDefinition)
