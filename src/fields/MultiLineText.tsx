import { useId } from 'react'
import type { MultiLineTextConfig } from '../types'
import { TextField } from '../components/common/TextField'
import { Checkbox } from '../components/common/Checkbox'
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

function ConfigPanel({ config, onChange, ctx }: FieldConfigPanelProps<MultiLineTextConfig>) {
  return (
    <div className="space-y-3">
      <TextField
        label="Label"
        value={config.label}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
        error={ctx.labelError}
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
      <TextField
        label="Visible rows"
        type="number"
        min={1}
        value={config.rows}
        onChange={(e) => onChange({ ...config, rows: Math.max(1, Number(e.target.value) || 1) })}
      />
    </div>
  )
}

function FillField({ config, value, onChange, error }: FieldFillProps<MultiLineTextConfig, Value>) {
  const inputId = useId()
  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {config.label}
        {config.required && <span className="field-required-mark"> *</span>}
      </label>
      <textarea
        id={inputId}
        className="field-input mt-1 resize-none"
        rows={config.rows}
        placeholder={config.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {config.maxLength !== undefined && (
        <p className="mt-1 text-xs text-muted">
          {value.length} / {config.maxLength}
        </p>
      )}
      {error && <p className="field-error">{error}</p>}
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
