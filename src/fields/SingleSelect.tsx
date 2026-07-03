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

function ConfigPanel({ config, onChange }: FieldConfigPanelProps<SingleSelectConfig>) {
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
      <label className="block text-sm font-medium text-slate-700">
        Display type
        <select
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
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
      <label className="block text-sm font-medium text-slate-700">
        {config.label}
        {config.required && <span className="text-red-500"> *</span>}
      </label>
      <div className="mt-1">
        {config.displayType === 'dropdown' && (
          <select
            className="block w-full rounded border border-slate-300 px-2 py-1"
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
              <label key={opt.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={groupName}
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
                className={`rounded border px-3 py-1.5 text-sm ${
                  value === opt.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
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
