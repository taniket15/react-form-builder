import type { ComponentType } from 'react'
import type { ConditionOperator, FieldConfig, FieldType } from '../types'

export interface ConditionOperatorDef {
  operator: ConditionOperator
  label: string
}

export interface FieldConfigPanelProps<C> {
  config: C
  onChange: (config: C) => void
}

export interface FieldFillProps<C, V> {
  config: C
  value: V
  onChange: (value: V) => void
  error?: string
}

/**
 * Adding an 11th field type = one new file implementing this interface + one
 * `registerField` call in the barrel (src/fields/index.ts). Nothing else changes.
 */
export interface FieldDefinition<C extends FieldConfig, V> {
  type: FieldType
  label: string
  icon: string
  createDefaultConfig: () => C
  ConfigPanel: ComponentType<FieldConfigPanelProps<C>>
  FillField: ComponentType<FieldFillProps<C, V>>
  getInitialValue: (config: C) => V
  /** No-op (returns null) for Section Header / Calculation — neither is ever validated. */
  validate: (value: V, config: C) => string | null
  /** Omitted entirely for non-targetable types: Section Header, Calculation, File Upload. */
  conditionOperators?: ConditionOperatorDef[]
  evaluateCondition?: (
    operator: ConditionOperator,
    targetValue: V,
    compareValue: unknown,
  ) => boolean
  /** Presence of this hook (vs. renderForPdf) is the capability signal — no boolean flag needed. */
  formatForDisplay?: (value: V, config: C) => string
  /** Section Header only: structural heading markup, no value. */
  renderForPdf?: (config: C) => string
}

// The registry stores definitions type-erased to a common shape. This is the single,
// well-contained cast in the app for the registry's type-erasure boundary (see plan
// docs/plan.md §1) — every field module itself stays fully typed against its own
// concrete config/value types; only storage/lookup here is generic over `unknown`.
type AnyFieldDefinition = FieldDefinition<FieldConfig, unknown>

const registry = new Map<FieldType, AnyFieldDefinition>()

export function registerField<C extends FieldConfig, V>(definition: FieldDefinition<C, V>): void {
  registry.set(definition.type, definition as unknown as AnyFieldDefinition)
}

export function getFieldDefinition(type: FieldType): AnyFieldDefinition {
  const definition = registry.get(type)
  if (!definition) {
    throw new Error(`No field definition registered for type "${type}"`)
  }
  return definition
}

export function getAllFieldDefinitions(): AnyFieldDefinition[] {
  return Array.from(registry.values())
}
