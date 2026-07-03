import { describe, expect, it } from 'vitest'
import '../fields'
import { resolveFieldStates } from './conditions'
import type { Condition, FormField } from '../types'

function textField(
  id: string,
  overrides: Partial<Pick<FormField, 'conditions' | 'defaultVisible'>> & { required?: boolean } = {},
): FormField {
  return {
    id,
    config: {
      type: 'singleLineText',
      label: id,
      required: overrides.required ?? false,
    },
    conditions: overrides.conditions ?? [],
    defaultVisible: overrides.defaultVisible ?? true,
  }
}

function condition(
  overrides: Partial<Condition> & Pick<Condition, 'targetFieldId' | 'operator' | 'effect'>,
): Condition {
  return {
    id: crypto.randomUUID(),
    value: undefined,
    ...overrides,
  }
}

describe('resolveFieldStates', () => {
  it('hides a field via a hide condition while resolving required independently', () => {
    const a = textField('a')
    const b = textField('b', {
      required: true,
      conditions: [condition({ targetFieldId: 'a', operator: 'equals', value: 'yes', effect: 'hide' })],
    })
    const states = resolveFieldStates([a, b], { a: 'yes', b: '' })
    expect(states.b?.visible).toBe(false)
    // required still resolves true here — it's the submit pipeline's job (Step 7) to
    // skip validating a field that's hidden, not this function's.
    expect(states.b?.required).toBe(true)
  })

  it('activates a field via independent rules (OR), not AND, across two show conditions', () => {
    const country = textField('country')
    const shipping = textField('shipping', {
      defaultVisible: false,
      conditions: [
        condition({ targetFieldId: 'country', operator: 'equals', value: 'India', effect: 'show' }),
        condition({ targetFieldId: 'country', operator: 'equals', value: 'USA', effect: 'show' }),
      ],
    })

    const india = resolveFieldStates([country, shipping], { country: 'India', shipping: '' })
    expect(india.shipping?.visible).toBe(true)

    const usa = resolveFieldStates([country, shipping], { country: 'USA', shipping: '' })
    expect(usa.shipping?.visible).toBe(true)

    const other = resolveFieldStates([country, shipping], { country: 'France', shipping: '' })
    expect(other.shipping?.visible).toBe(false)
  })

  it("resolves a condition against a target's raw stored value even when that target is itself hidden", () => {
    const a = textField('a')
    const b = textField('b', {
      conditions: [condition({ targetFieldId: 'a', operator: 'equals', value: 'x', effect: 'hide' })],
    })
    const c = textField('c', {
      defaultVisible: false,
      conditions: [condition({ targetFieldId: 'b', operator: 'equals', value: 'secret', effect: 'show' })],
    })

    const states = resolveFieldStates([a, b, c], { a: 'x', b: 'secret', c: '' })
    expect(states.b?.visible).toBe(false) // b is hidden by a
    expect(states.c?.visible).toBe(true) // c still reads b's raw stored value directly
  })

  it('resolves hide with precedence over a simultaneously-matching show', () => {
    const a = textField('a')
    const b = textField('b', {
      defaultVisible: false,
      conditions: [
        condition({ targetFieldId: 'a', operator: 'equals', value: 'x', effect: 'show' }),
        condition({ targetFieldId: 'a', operator: 'equals', value: 'x', effect: 'hide' }),
      ],
    })
    const states = resolveFieldStates([a, b], { a: 'x', b: '' })
    expect(states.b?.visible).toBe(false)
  })

  it('falls back to default visibility and config.required when no conditions match', () => {
    const a = textField('a')
    const b = textField('b', { required: true, defaultVisible: false })
    const states = resolveFieldStates([a, b], { a: 'anything', b: '' })
    expect(states.b?.visible).toBe(false)
    expect(states.b?.required).toBe(true)
  })
})
