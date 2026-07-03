import { describe, expect, it } from 'vitest'
import '../fields'
import { __internal } from './exportPdf'
import type { FormField } from '../types'

const { buildRowsHtml } = __internal

function textField(id: string, label = id): FormField {
  return {
    id,
    config: { type: 'singleLineText', label, required: false },
    conditions: [],
    defaultVisible: true,
  }
}

function sectionHeaderField(id: string, label = id): FormField {
  return {
    id,
    config: { type: 'sectionHeader', label, required: false, size: 'lg' },
    conditions: [],
    defaultVisible: true,
  }
}

function fileUploadField(id: string, label = id): FormField {
  return {
    id,
    config: { type: 'fileUpload', label, required: false },
    conditions: [],
    defaultVisible: true,
  }
}

function calculationField(id: string, label = id): FormField {
  return {
    id,
    config: {
      type: 'calculation',
      label,
      required: false,
      sourceFieldIds: [],
      aggregation: 'sum',
      decimalPlaces: 2,
    },
    conditions: [],
    defaultVisible: true,
  }
}

describe('buildRowsHtml', () => {
  it('excludes a field entirely when its id is absent from values (hidden at submit time)', () => {
    const visible = textField('a', 'Name')
    const hidden = textField('b', 'Secret')
    const html = buildRowsHtml([visible, hidden], { a: 'Alice' })
    expect(html).toContain('Name')
    expect(html).toContain('Alice')
    expect(html).not.toContain('Secret')
  })

  it('renders Section Header as a heading via renderForPdf, not a label/value row', () => {
    const header = sectionHeaderField('h1', 'About You')
    const html = buildRowsHtml([header], { h1: null })
    expect(html).toContain('<h2 class="pdf-section-header pdf-section-header--lg">About You</h2>')
    expect(html).not.toContain('pdf-field-label')
  })

  it('renders File Upload with a "file not embedded" note', () => {
    const upload = fileUploadField('f1', 'Attachment')
    const html = buildRowsHtml([upload], {
      f1: [{ name: 'resume.pdf', size: 2048, type: 'application/pdf' }],
    })
    expect(html).toContain('resume.pdf')
    expect(html).toContain('file not embedded')
  })

  it("renders a visible Calculation field's computed value as a normal label/value row", () => {
    const calc = calculationField('c1', 'Total')
    const html = buildRowsHtml([calc], { c1: 42 })
    expect(html).toContain('Total')
    expect(html).toContain('42.00')
    expect(html).not.toContain('pdf-section-header')
  })

  it('preserves field order and escapes HTML in labels', () => {
    const a = textField('a', 'First <b>Field</b>')
    const b = textField('b', 'Second')
    const html = buildRowsHtml([a, b], { a: 'x', b: 'y' })
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'))
    expect(html).toContain('&lt;b&gt;Field&lt;/b&gt;')
    expect(html).not.toContain('<b>Field</b>')
  })
})
