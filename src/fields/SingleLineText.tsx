import { useId } from 'react'
import type { SingleLineTextConfig } from '../types'
import { TextField } from '../components/common/TextField'
import { Checkbox } from '../components/common/Checkbox'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

type Value = string

function createDefaultConfig(): SingleLineTextConfig {
  return {
    type: 'singleLineText',
    label: 'Single Line Text',
    required: false,
  }
}

function ConfigPanel({ config, onChange }: FieldConfigPanelProps<SingleLineTextConfig>) {
  return (
    <div className="space-y-3">
      <TextField
        label="Label"
        value={config.label}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
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

function FillField({ config, value, onChange, error }: FieldFillProps<SingleLineTextConfig, Value>) {
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
          className={`block w-full border border-slate-300 px-2 py-1 ${config.prefix ? '' : 'rounded-l'} ${
            config.suffix ? '' : 'rounded-r'
          }`}
          placeholder={config.placeholder}
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

function validate(value: Value, config: SingleLineTextConfig): string | null {
  if (config.required && value.trim() === '') return `${config.label} is required`
  if (config.minLength !== undefined && value.length < config.minLength) {
    return `${config.label} must be at least ${config.minLength} characters`
  }
  if (config.maxLength !== undefined && value.length > config.maxLength) {
    return `${config.label} must be at most ${config.maxLength} characters`
  }
  return null
}

export const singleLineTextDefinition: FieldDefinition<SingleLineTextConfig, Value> = {
  type: 'singleLineText',
  label: 'Single Line Text',
  icon: '📝',
  createDefaultConfig,
  ConfigPanel,
  FillField,
  getInitialValue: () => '',
  validate,
  conditionOperators: [
    { operator: 'equals', label: 'equals' },
    { operator: 'notEquals', label: 'does not equal' },
    { operator: 'contains', label: 'contains' },
  ],
  evaluateCondition: (operator, targetValue, compareValue) => {
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
  },
  formatForDisplay: (value) => value,
}

registerField(singleLineTextDefinition)
