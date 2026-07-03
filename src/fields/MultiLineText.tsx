import type { MultiLineTextConfig } from '../types'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

type Value = string

function createDefaultConfig(): MultiLineTextConfig {
  return {
    type: 'multiLineText',
    label: 'Multi-line Text',
    required: false,
    rows: 4,
  }
}

function ConfigPanel({ config, onChange }: FieldConfigPanelProps<MultiLineTextConfig>) {
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
      <label className="block text-sm font-medium text-slate-700">
        Placeholder
        <input
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
          value={config.placeholder ?? ''}
          onChange={(e) => onChange({ ...config, placeholder: e.target.value })}
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
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">
          Min length
          <input
            type="number"
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
            value={config.minLength ?? ''}
            onChange={(e) =>
              onChange({
                ...config,
                minLength: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Max length
          <input
            type="number"
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
            value={config.maxLength ?? ''}
            onChange={(e) =>
              onChange({
                ...config,
                maxLength: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Visible rows
        <input
          type="number"
          min={1}
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
          value={config.rows}
          onChange={(e) => onChange({ ...config, rows: Math.max(1, Number(e.target.value) || 1) })}
        />
      </label>
    </div>
  )
}

function FillField({ config, value, onChange, error }: FieldFillProps<MultiLineTextConfig, Value>) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {config.label}
        {config.required && <span className="text-red-500"> *</span>}
      </label>
      <textarea
        className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
        rows={config.rows}
        placeholder={config.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

function validate(value: Value, config: MultiLineTextConfig): string | null {
  if (config.required && value.trim() === '') return `${config.label} is required`
  if (config.minLength !== undefined && value.length < config.minLength) {
    return `${config.label} must be at least ${config.minLength} characters`
  }
  if (config.maxLength !== undefined && value.length > config.maxLength) {
    return `${config.label} must be at most ${config.maxLength} characters`
  }
  return null
}

export const multiLineTextDefinition: FieldDefinition<MultiLineTextConfig, Value> = {
  type: 'multiLineText',
  label: 'Multi-line Text',
  icon: '📄',
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

registerField(multiLineTextDefinition)
