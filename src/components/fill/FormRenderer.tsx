import { useMemo } from 'react'
import type { FormField, FormValues } from '../../types'
import { getFieldDefinition } from '../../fields/registry'
import { resolveFieldStates } from '../../engine/conditions'
import { resolveFormValues } from '../../engine/calculations'

interface FormRendererProps {
  fields: FormField[]
  values: FormValues
  onChange: (fieldId: string, value: unknown) => void
  errors?: Record<string, string>
}

// Resolved `required` is threaded through by overriding `config.required` before
// handing off to a field's FillField, rather than adding a new prop — field modules
// already read `config.required` as the sole source of truth for their required
// indicator/validation, so a condition's `require`/`unrequire` effect flows through
// the same channel they already use, with no changes needed to any of the 9 field files.
//
// `resolveFieldStates` runs against the raw `values` (conditions never target
// Calculation fields, so the merge is irrelevant to visibility), but the `value`
// prop handed to each FillField comes from `resolveFormValues`'s merged output —
// that's the only place a Calculation field's live computed result actually exists.
export function FormRenderer({ fields, values, onChange, errors }: FormRendererProps) {
  const fieldStates = useMemo(() => resolveFieldStates(fields, values), [fields, values])
  const resolvedValues = useMemo(() => resolveFormValues(fields, values), [fields, values])

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const state = fieldStates[field.id]
        if (!state || !state.visible) return null
        const definition = getFieldDefinition(field.config.type)
        const FillField = definition.FillField
        const effectiveConfig = { ...field.config, required: state.required }
        return (
          <FillField
            key={field.id}
            config={effectiveConfig}
            value={resolvedValues[field.id]}
            onChange={(value) => onChange(field.id, value)}
            error={errors?.[field.id]}
          />
        )
      })}
    </div>
  )
}
