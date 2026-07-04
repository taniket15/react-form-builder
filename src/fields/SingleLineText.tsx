import { useId } from 'react'
import type { SingleLineTextConfig } from '../types'
import { TextField } from '../components/common/TextField'
import { TextLengthConfigFields, validateTextLength, evaluateStringEqualsContains } from './textFieldShared'
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

function ConfigPanel({ config, onChange, ctx }: FieldConfigPanelProps<SingleLineTextConfig>) {
  return (
    <div className="space-y-3">
      <TextLengthConfigFields config={config} onChange={onChange} labelError={ctx.labelError} />
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
      <label htmlFor={inputId} className="field-label">
        {config.label}
        {config.required && <span className="field-required-mark"> *</span>}
      </label>
      <div className="mt-1 flex items-stretch">
        {config.prefix && (
          <span className="field-input-addon rounded-l-[10px] border-r-0">{config.prefix}</span>
        )}
        <input
          id={inputId}
          className={`field-input ${config.prefix ? 'rounded-l-none border-l-0' : ''} ${
            config.suffix ? 'rounded-r-none border-r-0' : ''
          }`}
          placeholder={config.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
        {config.suffix && (
          <span className="field-input-addon rounded-r-[10px] border-l-0">{config.suffix}</span>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function validate(value: Value, config: SingleLineTextConfig): string | null {
  return validateTextLength(value, config)
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
  evaluateCondition: evaluateStringEqualsContains,
  formatForDisplay: (value, config) => {
    if (value === '') return ''
    return `${config.prefix ?? ''}${value}${config.suffix ?? ''}`
  },
}

registerField(singleLineTextDefinition)
