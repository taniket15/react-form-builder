import { TextField } from '../components/common/TextField'
import { Checkbox } from '../components/common/Checkbox'

// The "Label + Required" pair is the first two controls in every field type's
// ConfigPanel except Section Header (no Required toggle) and Calculation (no
// user-facing Required concept) — extracted once five field types repeated it verbatim.
export function LabelRequiredFields<C extends { label: string; required: boolean }>({
  config,
  onChange,
  labelError,
}: {
  config: C
  onChange: (config: C) => void
  labelError?: string
}) {
  return (
    <>
      <TextField
        label="Label"
        value={config.label}
        onChange={(e) => onChange({ ...config, label: e.target.value })}
        error={labelError}
      />
      <Checkbox
        label="Required"
        checked={config.required}
        onChange={(e) => onChange({ ...config, required: e.target.checked })}
      />
    </>
  )
}

export function DecimalPlacesField<C extends { decimalPlaces: number }>({
  config,
  onChange,
  label = 'Decimal places (0–4)',
}: {
  config: C
  onChange: (config: C) => void
  label?: string
}) {
  return (
    <TextField
      label={label}
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
  )
}
