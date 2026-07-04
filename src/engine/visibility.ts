import type { FormField, FormValues } from '../types'
import { getFieldDefinition } from '../fields/registry'
import { resolveFieldStates, type FieldState } from './conditions'
import { resolveFormValues } from './formValues'

export interface VisibleEntry {
  field: FormField
  value: unknown
}

// Intentionally dumb: filter + map, no logic of its own. `resolvedValues` already has
// calculation results merged in; `fieldStates` already has visibility resolved.
export function getVisibleEntries(
  fields: FormField[],
  resolvedValues: FormValues,
  fieldStates: Record<string, FieldState>,
): VisibleEntry[] {
  return fields
    .filter((f) => fieldStates[f.id]?.visible === true)
    .map((f) => ({ field: f, value: resolvedValues[f.id] }))
}

/**
 * Composes the shared submit/export pipeline in one call — resolveFormValues ->
 * resolveFieldStates -> getVisibleEntries — so submit (this step) and PDF export
 * (next step) run the exact same logic for "which fields count" and "what a
 * calculation's value is," and can't silently drift apart on either question.
 */
export function computeVisibleEntries(
  fields: FormField[],
  rawValues: FormValues,
): { entries: VisibleEntry[]; fieldStates: Record<string, FieldState> } {
  const resolvedValues = resolveFormValues(fields, rawValues)
  const fieldStates = resolveFieldStates(fields, rawValues)
  const entries = getVisibleEntries(fields, resolvedValues, fieldStates)
  return { entries, fieldStates }
}

/**
 * Only ever iterates over already-visible entries, so a hidden field can never
 * produce a validation error — "hidden field never validated as required" holds
 * structurally, not by a separate check. Uses each field's RESOLVED required
 * (which a `require`/`unrequire` condition may have overridden), not raw config.required.
 */
export function validateEntries(
  entries: VisibleEntry[],
  fieldStates: Record<string, FieldState>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const { field, value } of entries) {
    const definition = getFieldDefinition(field.config.type)
    const required = fieldStates[field.id]?.required ?? field.config.required
    const effectiveConfig = { ...field.config, required }
    const error = definition.validate(value, effectiveConfig)
    if (error) errors[field.id] = error
  }
  return errors
}
