import { useId } from 'react'
import type { CalculationConfig } from '../types'
import { TextField } from '../components/common/TextField'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

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
      />
      <label className="block text-sm font-medium text-slate-700">
        Aggregation
        <select
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
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
        <span className="block text-sm font-medium text-slate-700">Source fields (Number only)</span>
        {numberFields.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">Add a Number field to this form first.</p>
        ) : (
          <div className="mt-1 space-y-1">
            {numberFields.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.sourceFieldIds.includes(f.id)}
                  onChange={() => toggleSource(f.id)}
                />
                {f.config.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FillField({ config, value }: FieldFillProps<CalculationConfig, Value>) {
  const inputId = useId()
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {config.label}
      </label>
      <input
        id={inputId}
        type="text"
        readOnly
        disabled
        className="mt-1 block w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-slate-600"
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
