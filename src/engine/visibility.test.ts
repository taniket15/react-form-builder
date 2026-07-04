import { describe, expect, it } from 'vitest'
import '../fields'
import { computeVisibleEntries, getVisibleEntries, validateEntries } from './visibility'
import { resolveFieldStates } from './conditions'
import { resolveFormValues } from './formValues'
import type { Condition, FormField } from '../types'

function textField(
  id: string,
  overrides: Partial<Pick<FormField, 'conditions' | 'defaultVisible'>> & { required?: boolean } = {},
): FormField {
  return {
    id,
    config: { type: 'singleLineText', label: id, required: overrides.required ?? false },
    conditions: overrides.conditions ?? [],
    defaultVisible: overrides.defaultVisible ?? true,
  }
}

function condition(
  overrides: Pick<Condition, 'targetFieldId' | 'operator' | 'effect'> & Partial<Condition>,
): Condition {
  return { id: crypto.randomUUID(), value: undefined, ...overrides }
}

describe('getVisibleEntries', () => {
  it('excludes a hidden field from the output entirely', () => {
    const a = textField('a')
    const b = textField('b', {
      conditions: [condition({ targetFieldId: 'a', operator: 'equals', value: 'x', effect: 'hide' })],
    })
    const values = { a: 'x', b: 'hello' }
    const resolvedValues = resolveFormValues([a, b], values)
    const fieldStates = resolveFieldStates([a, b], values)
    const entries = getVisibleEntries([a, b], resolvedValues, fieldStates)
    expect(entries.map((e) => e.field.id)).toEqual(['a'])
  })
})

describe('validateEntries', () => {
  it('never produces an error for a hidden required field', () => {
    const a = textField('a')
    const b = textField('b', {
      required: true,
      conditions: [condition({ targetFieldId: 'a', operator: 'equals', value: 'x', effect: 'hide' })],
    })
    const values = { a: 'x', b: '' } // b is required and empty, but hidden
    const { entries, fieldStates } = computeVisibleEntries([a, b], values)
    const errors = validateEntries(entries, fieldStates)
    expect(errors.b).toBeUndefined()
  })

  it('produces an error for a visible required field left empty', () => {
    const a = textField('a', { required: true })
    const { entries, fieldStates } = computeVisibleEntries([a], { a: '' })
    const errors = validateEntries(entries, fieldStates)
    expect(errors.a).toBe('a is required')
  })

  it('validates using resolved (conditional) required, not just config.required', () => {
    const a = textField('a')
    const b = textField('b', {
      conditions: [condition({ targetFieldId: 'a', operator: 'equals', value: 'x', effect: 'require' })],
    })
    const { entries, fieldStates } = computeVisibleEntries([a, b], { a: 'x', b: '' })
    const errors = validateEntries(entries, fieldStates)
    expect(errors.b).toBe('b is required')
  })
})
