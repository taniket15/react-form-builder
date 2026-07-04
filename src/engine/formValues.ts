import type { FormField, FormValues } from '../types'
import { computeCalculations } from './calculations'

// The one place calculation results get merged into a values map keyed by field id —
// Calculation values are derived and never actually typed into rawValues, so anything
// that needs to *display* a calculation's value reads from this output, not rawValues.
export function resolveFormValues(fields: FormField[], rawValues: FormValues): FormValues {
  return { ...rawValues, ...computeCalculations(fields, rawValues) }
}
