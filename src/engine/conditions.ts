import type { Condition, FormField, FormValues } from '../types'
import { getFieldDefinition } from '../fields/registry'

export interface FieldState {
  visible: boolean
  required: boolean
}

// Every condition reads only the target field's RAW stored value — never another
// field's resolved {visible, required}. This is why no fixpoint/iteration is needed:
// a field's state depends purely on raw values, so there's no dependency graph to
// converge. A "chain" like *A hides B, C targets B* still resolves correctly in a
// single pass, because C reads B's raw stored value directly, regardless of what
// B's own visibility resolves to.
function evaluateCondition(condition: Condition, fields: FormField[], rawValues: FormValues): boolean {
  const targetField = fields.find((f) => f.id === condition.targetFieldId)
  if (!targetField) return false
  const definition = getFieldDefinition(targetField.config.type)
  if (!definition.evaluateCondition) return false
  const targetValue = rawValues[targetField.id]
  return definition.evaluateCondition(condition.operator, targetValue, condition.value)
}

/**
 * Collect-then-resolve, not sequential apply: every matched effect is gathered first,
 * then each state dimension is resolved independently by explicit precedence —
 * hide > show > default, require > unrequire > default. Conditions sharing an effect
 * are INDEPENDENT RULES (OR-like), not AND — e.g. "Country equals India -> show" OR
 * "Country equals USA -> show" correctly shows the field if either matches. AND-ing
 * conditions that share an effect would make that whole class of "show for any of
 * these values" configuration impossible to express.
 */
export function resolveFieldState(
  field: FormField,
  fields: FormField[],
  rawValues: FormValues,
): FieldState {
  const matchedEffects = field.conditions
    .filter((c) => evaluateCondition(c, fields, rawValues))
    .map((c) => c.effect)

  const visible = matchedEffects.includes('hide')
    ? false
    : matchedEffects.includes('show')
      ? true
      : field.defaultVisible

  const required = matchedEffects.includes('require')
    ? true
    : matchedEffects.includes('unrequire')
      ? false
      : field.config.required

  return { visible, required }
}

export function resolveFieldStates(
  fields: FormField[],
  rawValues: FormValues,
): Record<string, FieldState> {
  const result: Record<string, FieldState> = {}
  for (const field of fields) {
    result[field.id] = resolveFieldState(field, fields, rawValues)
  }
  return result
}
