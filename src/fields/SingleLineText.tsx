import { useId } from 'react'
import type { SingleLineTextConfig } from '../types'
import { TextField } from '../components/common/TextField'
import { AffixWrapper } from '../components/common/AffixInput'
import { affixInputClassName } from '../components/common/affixInputClassName'
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
      <AffixWrapper prefix={config.prefix} suffix={config.suffix}>
        <input
          id={inputId}
          className={`field-input ${affixInputClassName(config.prefix, config.suffix)}`}
          placeholder={config.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
      </AffixWrapper>
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
