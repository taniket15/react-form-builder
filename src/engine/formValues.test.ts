import { describe, expect, it } from 'vitest'
import '../fields'
import { resolveFormValues } from './formValues'
import type { CalculationConfig, FormField, FormValues } from '../types'

function numberField(id: string): FormField {
  return {
    id,
    config: { type: 'number', label: id, required: false, decimalPlaces: 2 },
    conditions: [],
    defaultVisible: true,
  }
}

function calcField(
  id: string,
  sourceFieldIds: string[],
  aggregation: CalculationConfig['aggregation'] = 'sum',
  decimalPlaces = 2,
): FormField {
  return {
    id,
    config: {
      type: 'calculation',
      label: id,
      required: false,
      sourceFieldIds,
      aggregation,
      decimalPlaces,
    },
    conditions: [],
    defaultVisible: true,
  }
}

describe('resolveFormValues', () => {
  it('merges calculation results without mutating raw values', () => {
    const a = numberField('a')
    const total = calcField('total', ['a'], 'sum')
    const raw: FormValues = { a: '7' }
    const resolved = resolveFormValues([a, total], raw)
    expect(resolved.a).toBe('7')
    expect(resolved.total).toBe(7)
    expect(raw.total).toBeUndefined()
  })
})
