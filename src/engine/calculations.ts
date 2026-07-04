import type { FormField, FormValues } from '../types'
import { parseNumber } from '../fields/NumberField'

// Empty/never-filled source counts as 0 for Sum/Min/Max (the calculation is a derived
// quantity, not a "what's currently shown" summary), and is excluded from the
// denominator for Average (an unfilled field shouldn't drag the average toward 0).
function getSourceNumbers(sourceFieldIds: string[], fields: FormField[], rawValues: FormValues): (number | null)[] {
  return sourceFieldIds.map((sourceId) => {
    const sourceField = fields.find((f) => f.id === sourceId)
    if (!sourceField || sourceField.config.type !== 'number') return null
    const raw = rawValues[sourceId]
    return typeof raw === 'string' ? parseNumber(raw) : null
  })
}

export function computeCalculations(fields: FormField[], rawValues: FormValues): Record<string, number> {
  const result: Record<string, number> = {}

  for (const field of fields) {
    if (field.config.type !== 'calculation') continue
    const config = field.config
    // A Calculation may not use another Calculation as a source — getSourceNumbers
    // already excludes non-Number sources, so a Calculation id in sourceFieldIds
    // contributes `null` (treated as absent), never its own computed value.
    const numbers = getSourceNumbers(config.sourceFieldIds, fields, rawValues)

    let value: number
    switch (config.aggregation) {
      case 'sum':
        value = numbers.reduce((acc: number, n) => acc + (n ?? 0), 0)
        break
      case 'min':
        value = numbers.length === 0 ? 0 : Math.min(...numbers.map((n) => n ?? 0))
        break
      case 'max':
        value = numbers.length === 0 ? 0 : Math.max(...numbers.map((n) => n ?? 0))
        break
      case 'average': {
        const present = numbers.filter((n): n is number => n !== null)
        value = present.length === 0 ? 0 : present.reduce((acc, n) => acc + n, 0) / present.length
        break
      }
    }

    result[field.id] = Number(value.toFixed(config.decimalPlaces))
  }

  return result
}
