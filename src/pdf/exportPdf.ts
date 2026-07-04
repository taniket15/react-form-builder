import type { FormField, FormResponse, FormValues } from '../types'
import { getFieldDefinition } from '../fields/registry'
import { escapeHtml } from '../utils/escapeHtml'
import { formatDateTime } from '../utils/formatDateTime'

function renderFieldRow(field: FormField, value: unknown): string {
  const definition = getFieldDefinition(field.config.type)
  if (definition.renderForPdf) {
    return definition.renderForPdf(field.config)
  }
  const label = escapeHtml(field.config.label)
  const displayValue = definition.formatForDisplay ? definition.formatForDisplay(value, field.config) : ''
  const valueHtml = displayValue
    ? escapeHtml(displayValue)
    : '<span class="pdf-empty">(no answer)</span>'
  return `<div class="pdf-field-row"><div class="pdf-field-label">${label}</div><div class="pdf-field-value">${valueHtml}</div></div>`
}

/**
 * Renders exactly the fields present as keys in `values`, in `fields` order.
 * Deliberately does NOT re-run resolveFieldStates over `values` — by the time this
 * runs, `values` may already be a submitted response's filtered data (hidden fields
 * excluded), so re-evaluating conditions against it could mis-resolve a field whose
 * visibility depended on a now-absent hidden field's value. The set of keys present
 * IS the already-finalized visibility decision; this function only displays it.
 */
function buildRowsHtml(fields: FormField[], values: FormValues): string {
  return fields
    .filter((field) => field.id in values)
    .map((field) => renderFieldRow(field, values[field.id]))
    .join('\n')
}

function buildHtmlDocument(title: string, submittedAt: string, rowsHtml: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #2e2a24;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 32px;
  }
  h1.pdf-title { font-size: 26px; margin: 0 0 4px; }
  .pdf-timestamp {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: #8a7f6d; font-size: 12px; margin: 0 0 32px;
  }
  .pdf-field-row { margin: 0 0 16px; break-inside: avoid; page-break-inside: avoid; }
  .pdf-field-label {
    font-size: 12px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.04em; color: #8a7f6d; margin-bottom: 2px;
  }
  .pdf-field-value { font-size: 15px; font-weight: 600; line-height: 1.5; white-space: pre-wrap; }
  .pdf-field-value .pdf-empty { color: #a89e8c; font-style: italic; font-weight: 400; }
  .pdf-section-header {
    margin: 28px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #2e2a24;
    text-transform: uppercase; letter-spacing: 0.04em;
    break-inside: avoid; page-break-inside: avoid;
  }
  .pdf-section-header--xs { font-size: 12px; font-weight: 600; }
  .pdf-section-header--sm { font-size: 14px; font-weight: 600; }
  .pdf-section-header--md { font-size: 16px; font-weight: 700; }
  .pdf-section-header--lg { font-size: 19px; font-weight: 700; }
  .pdf-section-header--xl { font-size: 23px; font-weight: 700; }
  @media print {
    body { padding: 0; max-width: 100%; }
    @page { margin: 20mm 16mm; }
  }
</style>
</head>
<body>
<h1 class="pdf-title">${escapeHtml(title)}</h1>
<p class="pdf-timestamp">Submitted ${escapeHtml(formatDateTime(submittedAt))}</p>
${rowsHtml}
</body>
</html>`
}

function openPrintWindow(html: string): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    window.alert('Please allow pop-ups for this site to download the PDF.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

/**
 * The one PDF export entry point in the app, used from the Responses list — both
 * the first download and any later re-download call this the same way. Renders
 * `response.templateSnapshot` and `response.values` exactly, so the export is
 * byte-for-byte reproducible regardless of edits made to the live template afterward.
 * (Fill Mode itself has no separate "Download PDF" — the spec requires the exported
 * PDF to include a genuine submission timestamp, which doesn't exist until Submit
 * has actually created a FormResponse.)
 */
export function exportResponseToPdf(response: FormResponse): void {
  const rowsHtml = buildRowsHtml(response.templateSnapshot.fields, response.values)
  const html = buildHtmlDocument(response.templateSnapshot.title, response.submittedAt, rowsHtml)
  openPrintWindow(html)
}

// Exported for unit testing the pure HTML-building logic without touching window.open/print.
export const __internal = { buildRowsHtml, buildHtmlDocument, renderFieldRow }
