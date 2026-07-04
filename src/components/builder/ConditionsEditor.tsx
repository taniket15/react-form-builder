import type { Condition, ConditionEffect, ConditionOperator, FormField, RangeValue } from '../../types'
import { getFieldDefinition } from '../../fields/registry'
import { Badge } from '../common/Badge'

const EFFECT_LABELS: Record<ConditionEffect, string> = {
  show: 'Show',
  hide: 'Hide',
  require: 'Require',
  unrequire: 'Unrequire',
}

// Same colors as the Canvas condition-summary Badge (show=green, hide/require=danger-ish,
// unrequire=neutral) — the effect select itself is styled to read as a pill.
const EFFECT_PILL_CLASSES: Record<ConditionEffect, string> = {
  show: 'bg-success-tint text-success',
  hide: 'bg-danger-tint text-danger',
  require: 'bg-danger-tint text-danger',
  unrequire: 'bg-surface-sunken text-ink-soft',
}

const SMALL_SELECT = 'rounded-[8px] border border-ink/15 bg-surface px-1.5 py-1 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'
const SMALL_INPUT = 'rounded-[8px] border border-ink/15 bg-surface px-2 py-1 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'

function isRangeValue(value: unknown): value is RangeValue {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return typeof obj.min === 'number' && typeof obj.max === 'number'
}

function ValueEditor({
  targetField,
  operator,
  value,
  onChange,
}: {
  targetField: FormField
  operator: ConditionOperator
  value: unknown
  onChange: (value: unknown) => void
}) {
  if (operator === 'withinRange') {
    const range = isRangeValue(value) ? value : { min: 0, max: 0 }
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          className={`w-20 ${SMALL_INPUT}`}
          value={range.min}
          onChange={(e) => onChange({ ...range, min: Number(e.target.value) })}
        />
        <span className="text-sm text-muted">to</span>
        <input
          type="number"
          className={`w-20 ${SMALL_INPUT}`}
          value={range.max}
          onChange={(e) => onChange({ ...range, max: Number(e.target.value) })}
        />
      </div>
    )
  }

  if (operator === 'containsAnyOf' || operator === 'containsAllOf' || operator === 'containsNoneOf') {
    const options = targetField.config.type === 'multiSelect' ? targetField.config.options : []
    const selected = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt.id} className="flex items-center gap-1 text-sm text-ink">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={selected.includes(opt.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...selected, opt.id] : selected.filter((id) => id !== opt.id),
                )
              }
            />
            {opt.label}
          </label>
        ))}
      </div>
    )
  }

  if (targetField.config.type === 'singleSelect') {
    return (
      <select className={SMALL_SELECT} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {targetField.config.options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  if (targetField.config.type === 'number') {
    return (
      <input
        type="number"
        className={`w-24 ${SMALL_INPUT}`}
        value={typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    )
  }

  if (targetField.config.type === 'date') {
    return (
      <input
        type="date"
        className={SMALL_INPUT}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  return (
    <input
      type="text"
      className={SMALL_INPUT}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function ConditionsEditor({
  field,
  allFields,
  onChange,
}: {
  field: FormField
  allFields: FormField[]
  onChange: (conditions: Condition[]) => void
}) {
  // Excludes self and any type without conditionOperators defined (Section Header,
  // Calculation, File Upload) — driven by the registry's own capability data, not a
  // hardcoded type list.
  const targetableFields = allFields.filter(
    (f) => f.id !== field.id && getFieldDefinition(f.config.type).conditionOperators !== undefined,
  )

  function updateCondition(id: string, patch: Partial<Condition>) {
    onChange(field.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function handleAdd() {
    const firstTarget = targetableFields[0]
    if (!firstTarget) return
    const operators = getFieldDefinition(firstTarget.config.type).conditionOperators ?? []
    const firstOperator = operators[0]
    if (!firstOperator) return
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      targetFieldId: firstTarget.id,
      operator: firstOperator.operator,
      value: undefined,
      effect: 'show',
    }
    onChange([...field.conditions, newCondition])
  }

  function handleTargetChange(conditionId: string, targetFieldId: string) {
    const targetField = allFields.find((f) => f.id === targetFieldId)
    const operators = targetField
      ? (getFieldDefinition(targetField.config.type).conditionOperators ?? [])
      : []
    const firstOperator = operators[0]
    updateCondition(conditionId, {
      targetFieldId,
      operator: firstOperator ? firstOperator.operator : 'equals',
      value: undefined,
    })
  }

  if (targetableFields.length === 0) {
    return (
      <div className="border-t border-ink/10 pt-3">
        <h3 className="mb-2 text-sm font-semibold text-ink-soft">Conditions</h3>
        <p className="text-xs text-muted">Add another field to this form to create conditions.</p>
      </div>
    )
  }

  const ruleCount = field.conditions.length

  return (
    <div className="border-t border-ink/10 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-soft">Conditions on "{field.config.label}"</h3>
        {ruleCount > 0 && (
          <Badge variant="count">
            {ruleCount} rule{ruleCount === 1 ? '' : 's'}
          </Badge>
        )}
      </div>
      <div className="space-y-3">
        {field.conditions.map((condition) => {
          const targetField = allFields.find((f) => f.id === condition.targetFieldId)
          const operators = targetField
            ? (getFieldDefinition(targetField.config.type).conditionOperators ?? [])
            : []
          return (
            <div key={condition.id} className="space-y-2 rounded-xl border border-ink/10 bg-surface p-2">
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <select
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${EFFECT_PILL_CLASSES[condition.effect]}`}
                  value={condition.effect}
                  onChange={(e) =>
                    updateCondition(condition.id, { effect: e.target.value as ConditionEffect })
                  }
                >
                  {(Object.keys(EFFECT_LABELS) as ConditionEffect[]).map((effect) => (
                    <option key={effect} value={effect}>
                      {EFFECT_LABELS[effect]}
                    </option>
                  ))}
                </select>
                <span className="text-muted">when</span>
                <select
                  className={SMALL_SELECT}
                  value={condition.targetFieldId}
                  onChange={(e) => handleTargetChange(condition.id, e.target.value)}
                >
                  {targetableFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.config.label}
                    </option>
                  ))}
                </select>
                <select
                  className={SMALL_SELECT}
                  value={condition.operator}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      operator: e.target.value as ConditionOperator,
                      value: undefined,
                    })
                  }
                >
                  {operators.map((op) => (
                    <option key={op.operator} value={op.operator}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onChange(field.conditions.filter((c) => c.id !== condition.id))}
                  className="ml-auto text-muted hover:text-danger"
                  aria-label="Remove condition"
                >
                  ✕
                </button>
              </div>
              {targetField && (
                <ValueEditor
                  targetField={targetField}
                  operator={condition.operator}
                  value={condition.value}
                  onChange={(value) => updateCondition(condition.id, { value })}
                />
              )}
            </div>
          )
        })}
      </div>
      <button type="button" onClick={handleAdd} className="mt-2 text-sm text-primary hover:underline">
        + Add condition
      </button>
      <p className="mt-3 text-xs text-muted">
        <span className="font-medium text-ink-soft">Precedence:</span> Hide beats Show, Require beats
        Unrequire. A hidden field is never validated and is left out of the response &amp; PDF.
      </p>
    </div>
  )
}
