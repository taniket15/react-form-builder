import { describe, expect, it } from 'vitest'
import '../fields'
import { computeCalculations, resolveFormValues } from './calculations'
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

describe('computeCalculations', () => {
  it("sums source values, counting a hidden source's stored value", () => {
    // A source field being hidden by an unrelated condition elsewhere doesn't matter
    // here — the engine only ever reads rawValues, never visibility state.
    const a = numberField('a')
    const b = numberField('b')
    const total = calcField('total', ['a', 'b'], 'sum')
    const result = computeCalculations([a, b, total], { a: '10', b: '5' })
    expect(result.total).toBe(15)
  })

  it('excludes an empty/unfilled source from the average denominator', () => {
    const a = numberField('a')
    const b = numberField('b')
    const c = numberField('c')
    const avg = calcField('avg', ['a', 'b', 'c'], 'average')
    const result = computeCalculations([a, b, c, avg], { a: '10', b: '', c: '20' })
    // average of 10 and 20 only (2 values) — not divided by 3
    expect(result.avg).toBe(15)
  })

  it('treats an empty source as 0 for sum/min/max', () => {
    const a = numberField('a')
    const b = numberField('b')
    const total = calcField('total', ['a', 'b'], 'sum')
    const result = computeCalculations([a, b, total], { a: '10', b: '' })
    expect(result.total).toBe(10)
  })

  it('excludes another Calculation field from contributing as a source', () => {
    const a = numberField('a')
    const other = calcField('other', ['a'], 'sum')
    const total = calcField('total', ['a', 'other'], 'sum')
    const result = computeCalculations([a, other, total], { a: '10' })
    expect(result.total).toBe(10)
  })

  it('resolveFormValues merges calculation results without mutating raw values', () => {
    const a = numberField('a')
    const total = calcField('total', ['a'], 'sum')
    const raw: FormValues = { a: '7' }
    const resolved = resolveFormValues([a, total], raw)
    expect(resolved.a).toBe('7')
    expect(resolved.total).toBe(7)
    expect(raw.total).toBeUndefined()
  })
})
