import { useId } from 'react'
import type { SingleSelectConfig } from '../types'
import { OptionsEditor } from '../components/builder/OptionsEditor'
import { TextField } from '../components/common/TextField'
import { Checkbox } from '../components/common/Checkbox'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

// Selected value is the option's id, not its label — consistent with how the rest of
// the app references entities by id (targetFieldId, sourceFieldIds). Labels can be
// edited later without silently breaking already-stored responses or conditions.
type Value = string

function createDefaultConfig(): SingleSelectConfig {
  return {
    type: 'singleSelect',
    label: 'Single Select',
    required: false,
    options: [
      { id: crypto.randomUUID(), label: 'Option 1' },
      { id: crypto.randomUUID(), label: 'Option 2' },
    ],
    displayType: 'radio',
  }
}

function ConfigPanel({ config, onChange, ctx }: FieldConfigPanelProps<SingleSelectConfig>) {
  return (
    <div className="space-y-3">
      <TextField
        label="Label"
        value={config.label}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
        error={ctx.labelError}
      />
      <Checkbox
        label="Required"
        checked={config.required}
        onChange={(e) => onChange({ ...config, required: e.target.checked })}
      />
      <label className="field-label">
        Display type
        <select
          className="field-select mt-1"
          value={config.displayType}
          onChange={(e) =>
            onChange({ ...config, displayType: e.target.value as SingleSelectConfig['displayType'] })
          }
        >
          <option value="radio">Radio</option>
          <option value="dropdown">Dropdown</option>
          <option value="tiles">Tiles</option>
        </select>
      </label>
      <OptionsEditor options={config.options} onChange={(options) => onChange({ ...config, options })} />
    </div>
  )
}

function FillField({ config, value, onChange, error }: FieldFillProps<SingleSelectConfig, Value>) {
  const groupName = useId()

  return (
    <div>
      <label className="field-label">
        {config.label}
        {config.required && <span className="field-required-mark"> *</span>}
      </label>
      <div className="mt-1">
        {config.displayType === 'dropdown' && (
          <select
            className="field-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={!!error}
          >
            <option value="">Select…</option>
            {config.options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {config.displayType === 'radio' && (
          <div className="space-y-1">
            {config.options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name={groupName}
                  className="size-4 accent-primary"
                  checked={value === opt.id}
                  onChange={() => onChange(opt.id)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}
        {config.displayType === 'tiles' && (
          <div className="flex flex-wrap gap-2">
            {config.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
                className={`rounded-[10px] border px-3 py-1.5 text-sm ${
                  value === opt.id
                    ? 'border-[1.5px] border-primary bg-primary-tint text-ink'
                    : 'border-ink/15 text-ink hover:border-primary/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function validate(value: Value, config: SingleSelectConfig): string | null {
  if (config.required && value === '') return `${config.label} is required`
  return null
}

export const singleSelectDefinition: FieldDefinition<SingleSelectConfig, Value> = {
  type: 'singleSelect',
  label: 'Single Select',
  icon: '🔘',
  createDefaultConfig,
  ConfigPanel,
  FillField,
  getInitialValue: () => '',
  validate,
  conditionOperators: [
    { operator: 'equals', label: 'equals' },
    { operator: 'notEquals', label: 'does not equal' },
  ],
  evaluateCondition: (operator, targetValue, compareValue) => {
    const compare = typeof compareValue === 'string' ? compareValue : ''
    switch (operator) {
      case 'equals':
        return targetValue === compare
      case 'notEquals':
        return targetValue !== compare
      default:
        return false
    }
  },
  formatForDisplay: (value, config) => config.options.find((o) => o.id === value)?.label ?? '',
}

registerField(singleSelectDefinition)
