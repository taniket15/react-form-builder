import { useId } from 'react'
import type { MultiLineTextConfig } from '../types'
import { TextField } from '../components/common/TextField'
import { TextLengthConfigFields, validateTextLength, evaluateStringEqualsContains } from './textFieldShared'
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
      <TextLengthConfigFields config={config} onChange={onChange} labelError={ctx.labelError} />
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
  return validateTextLength(value, config)
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
  evaluateCondition: evaluateStringEqualsContains,
  formatForDisplay: (value) => value,
}

registerField(multiLineTextDefinition)
