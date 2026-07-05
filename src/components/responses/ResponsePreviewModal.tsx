import { getFieldDefinition } from '../../fields/registry'
import { formatDateTime } from '../../utils/formatDateTime'
import { Button } from '../common/Button'
import { CategoryLabel } from '../common/CategoryLabel'
import type { FormResponse } from '../../types'

// A read-only summary of an already-submitted response — not the interactive
// FormRenderer used by Fill/Builder-preview, since there's nothing left to edit here.
// Deliberately does NOT re-run the visibility pipeline: `response.values`' keys ARE
// the already-finalized set of visible fields at submit time (same reasoning as
// exportPdf.ts's buildRowsHtml), so we just filter+iterate templateSnapshot.fields
// in order. Section Header renders as a heading (registry's `renderForPdf` presence
// is the same "this is a heading, not a value" signal used elsewhere); every other
// field renders its `formatForDisplay` (or `formatForDisplayList`) value as a
// label/value row, matching the PDF.
export function ResponsePreviewModal({
  response,
  onClose,
}: {
  response: FormResponse
  onClose: () => void
}) {
  const { templateSnapshot, values } = response
  const visibleFields = templateSnapshot.fields.filter((field) => field.id in values)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/10 p-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{templateSnapshot.title}</h2>
            <p className="text-xs text-muted">Submitted {formatDateTime(response.submittedAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink"
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {visibleFields.length === 0 ? (
            <p className="text-sm text-muted">This response has no visible answers.</p>
          ) : (
            visibleFields.map((field) => {
              const definition = getFieldDefinition(field.config.type)
              if (definition.renderForPdf) {
                return (
                  <h3
                    key={field.id}
                    className="border-b border-ink/15 pb-2 text-base font-semibold text-ink"
                  >
                    {field.config.label}
                  </h3>
                )
              }
              if (definition.formatForDisplayList) {
                const items = definition.formatForDisplayList(values[field.id], field.config)
                return (
                  <div key={field.id}>
                    <CategoryLabel>{field.config.label}</CategoryLabel>
                    {items.length ? (
                      <ul className="mt-0.5 list-disc pl-4 text-sm text-ink">
                        {items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-0.5 text-sm italic text-muted">(no answer)</p>
                    )}
                  </div>
                )
              }
              const display = definition.formatForDisplay?.(values[field.id], field.config) ?? ''
              return (
                <div key={field.id}>
                  <CategoryLabel>{field.config.label}</CategoryLabel>
                  <p className="mt-0.5 text-sm text-ink">
                    {display || <span className="italic text-muted">(no answer)</span>}
                  </p>
                </div>
              )
            })
          )}
        </div>
        <div className="border-t border-ink/10 p-4">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
