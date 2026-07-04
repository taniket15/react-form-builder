import type { MultiSelectConfig } from '../types'
import { OptionsEditor } from '../components/builder/OptionsEditor'
import { TextField } from '../components/common/TextField'
import { Checkbox } from '../components/common/Checkbox'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

// Selected values are option ids, same reasoning as Single Select.
type Value = string[]

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

function createDefaultConfig(): MultiSelectConfig {
  return {
    type: 'multiSelect',
    label: 'Multi Select',
    required: false,
    options: [
      { id: crypto.randomUUID(), label: 'Option 1' },
      { id: crypto.randomUUID(), label: 'Option 2' },
    ],
  }
}

function ConfigPanel({ config, onChange, ctx }: FieldConfigPanelProps<MultiSelectConfig>) {
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
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Min selections"
          type="number"
          value={config.minSelections ?? ''}
          onChange={(e) =>
            onChange({
              ...config,
              minSelections: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
        <TextField
          label="Max selections"
          type="number"
          value={config.maxSelections ?? ''}
          onChange={(e) =>
            onChange({
              ...config,
              maxSelections: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
      </div>
      <OptionsEditor options={config.options} onChange={(options) => onChange({ ...config, options })} />
    </div>
  )
}

function FillField({ config, value, onChange, error }: FieldFillProps<MultiSelectConfig, Value>) {
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  const hasBounds = config.minSelections !== undefined || config.maxSelections !== undefined

  return (
    <div>
      <label className="field-label">
        {config.label}
        {config.required && <span className="field-required-mark"> *</span>}
      </label>
      <div className="mt-1 space-y-1">
        {config.options.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={value.includes(opt.id)}
              onChange={() => toggle(opt.id)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {hasBounds && (
        <p className="mt-1 text-xs text-muted">
          Choose {config.minSelections ?? 0}
          {config.maxSelections !== undefined ? `–${config.maxSelections}` : '+'}
        </p>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

// Decision: a fully-empty optional Multi Select is allowed regardless of minSelections
// ("optional" should mean the empty state is fine); a partial selection that doesn't
// meet minSelections is still an error, since an in-between state can't be submitted.
function validate(value: Value, config: MultiSelectConfig): string | null {
  if (value.length === 0) {
    return config.required ? `${config.label} is required` : null
  }
  if (config.minSelections !== undefined && value.length < config.minSelections) {
    return `Select at least ${config.minSelections} option(s) for ${config.label}`
  }
  if (config.maxSelections !== undefined && value.length > config.maxSelections) {
    return `Select at most ${config.maxSelections} option(s) for ${config.label}`
  }
  return null
}

export const multiSelectDefinition: FieldDefinition<MultiSelectConfig, Value> = {
  type: 'multiSelect',
  label: 'Multi Select',
  icon: '☑️',
  createDefaultConfig,
  ConfigPanel,
  FillField,
  getInitialValue: () => [],
  validate,
  conditionOperators: [
    { operator: 'containsAnyOf', label: 'contains any of' },
    { operator: 'containsAllOf', label: 'contains all of' },
    { operator: 'containsNoneOf', label: 'contains none of' },
  ],
  evaluateCondition: (operator, targetValue, compareValue) => {
    const compareIds = toStringArray(compareValue)
    switch (operator) {
      case 'containsAnyOf':
        return targetValue.some((id) => compareIds.includes(id))
      case 'containsAllOf':
        return compareIds.every((id) => targetValue.includes(id))
      case 'containsNoneOf':
        return !targetValue.some((id) => compareIds.includes(id))
      default:
        return false
    }
  },
  formatForDisplay: (value, config) =>
    value
      .map((id) => config.options.find((o) => o.id === id)?.label ?? '')
      .filter(Boolean)
      .join(', '),
}

registerField(multiSelectDefinition)
