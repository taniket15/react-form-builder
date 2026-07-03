import { describe, expect, it } from 'vitest'
import { formatDateTime } from './formatDateTime'

describe('formatDateTime', () => {
  it('formats with an ordinal day, full month name, and lowercase am/pm', () => {
    const iso = new Date(2026, 6, 4, 1, 59).toISOString()
    expect(formatDateTime(iso)).toBe('4th July 2026, 01:59 am')
  })

  it('handles noon and midnight correctly (12, not 0)', () => {
    expect(formatDateTime(new Date(2026, 0, 1, 12, 0).toISOString())).toBe('1st January 2026, 12:00 pm')
    expect(formatDateTime(new Date(2026, 0, 1, 0, 0).toISOString())).toBe('1st January 2026, 12:00 am')
  })

  it('uses "th" for 11th, 12th, 13th (not st/nd/rd)', () => {
    expect(formatDateTime(new Date(2026, 0, 11, 9, 5).toISOString())).toContain('11th')
    expect(formatDateTime(new Date(2026, 0, 12, 9, 5).toISOString())).toContain('12th')
    expect(formatDateTime(new Date(2026, 0, 13, 9, 5).toISOString())).toContain('13th')
  })

  it('uses st/nd/rd for 21st, 22nd, 23rd', () => {
    expect(formatDateTime(new Date(2026, 0, 21, 9, 5).toISOString())).toContain('21st')
    expect(formatDateTime(new Date(2026, 0, 22, 9, 5).toISOString())).toContain('22nd')
    expect(formatDateTime(new Date(2026, 0, 23, 9, 5).toISOString())).toContain('23rd')
  })
})
