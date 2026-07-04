import { useId } from 'react'
import type { CalculationConfig, FormField } from '../types'
import { TextField } from '../components/common/TextField'
import { Badge } from '../components/common/Badge'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

const AGGREGATION_LABEL: Record<CalculationConfig['aggregation'], string> = {
  sum: 'Sum',
  average: 'Average',
  min: 'Minimum',
  max: 'Maximum',
}

// Read-only caption describing what's being computed, e.g. "Sum of Guests, Tickets" —
// aggregation only, no arithmetic offset (the design mockup's "+1" caption is cosmetic
// and intentionally not implemented — see docs/design-plan.md).
function describeAggregation(config: CalculationConfig, allFields: FormField[]): string {
  const sourceLabels = config.sourceFieldIds
    .map((id) => allFields.find((f) => f.id === id)?.config.label)
    .filter((label): label is string => Boolean(label))
  if (sourceLabels.length === 0) return `${AGGREGATION_LABEL[config.aggregation]} of no fields yet`
  return `${AGGREGATION_LABEL[config.aggregation]} of ${sourceLabels.join(', ')}`
}

// The computed value is never stored in raw Fill values — it's derived on every
// render by the calculations engine (resolveFormValues) and passed in as `value`
// purely for display. onChange is never called; there is no editable input.
type Value = number

function createDefaultConfig(): CalculationConfig {
  return {
    type: 'calculation',
    label: 'Calculation',
    required: false,
    sourceFieldIds: [],
    aggregation: 'sum',
    decimalPlaces: 0,
  }
}

function ConfigPanel({ config, onChange, ctx }: FieldConfigPanelProps<CalculationConfig>) {
  // A Calculation may not use another Calculation as a source — only Number fields
  // are offered here.
  const numberFields = ctx.allFields.filter((f) => f.config.type === 'number')

  function toggleSource(fieldId: string) {
    const next = config.sourceFieldIds.includes(fieldId)
      ? config.sourceFieldIds.filter((id) => id !== fieldId)
      : [...config.sourceFieldIds, fieldId]
    onChange({ ...config, sourceFieldIds: next })
  }

  return (
    <div className="space-y-3">
      <TextField
        label="Label"
        value={config.label}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
        error={ctx.labelError}
      />
      <label className="field-label">
        Aggregation
        <select
          className="field-select mt-1"
          value={config.aggregation}
          onChange={(e) =>
            onChange({ ...config, aggregation: e.target.value as CalculationConfig['aggregation'] })
          }
        >
          <option value="sum">Sum</option>
          <option value="average">Average</option>
          <option value="min">Minimum</option>
          <option value="max">Maximum</option>
        </select>
      </label>
      <TextField
        label="Decimal places"
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
      <div>
        <span className="field-label">Source fields (Number only)</span>
        {numberFields.length === 0 ? (
          <p className="mt-1 text-xs text-muted">Add a Number field to this form first.</p>
        ) : (
          <div className="mt-1 space-y-1">
            {numberFields.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={config.sourceFieldIds.includes(f.id)}
                  onChange={() => toggleSource(f.id)}
                />
                {f.config.label}
              </label>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-muted">{describeAggregation(config, ctx.allFields)}</p>
      </div>
    </div>
  )
}

function FillField({ config, value }: FieldFillProps<CalculationConfig, Value>) {
  const inputId = useId()
  return (
    <div>
      <label htmlFor={inputId} className="field-label flex items-center gap-2">
        {config.label}
        <Badge variant="calc">Σ {AGGREGATION_LABEL[config.aggregation]}</Badge>
      </label>
      <input
        id={inputId}
        type="text"
        readOnly
        disabled
        className="mt-1 block w-full rounded-[10px] border border-calc/30 bg-calc-tint px-2 py-1.5 font-medium text-calc"
        value={value.toFixed(config.decimalPlaces)}
      />
    </div>
  )
}

function validate(): string | null {
  return null
}

export const calculationDefinition: FieldDefinition<CalculationConfig, Value> = {
  type: 'calculation',
  label: 'Calculation',
  icon: '🧮',
  createDefaultConfig,
  ConfigPanel,
  FillField,
  getInitialValue: () => 0,
  validate,
  // No conditionOperators — Calculation can't be a condition target (§1).
  formatForDisplay: (value, config) => value.toFixed(config.decimalPlaces),
}

registerField(calculationDefinition)
