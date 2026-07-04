import { useState } from 'react'
import { FormRenderer } from '../fill/FormRenderer'
import { Button } from '../common/Button'
import { getFieldDefinition } from '../../fields/registry'
import type { FormTemplate, FormValues } from '../../types'

// Preview renders the same FormRenderer as real Fill mode over the draft, but its
// "Submit" just closes the modal — it never writes to ResponsesContext, so testing
// a form as a builder can't pollute the real Responses list. There's also no
// Download PDF here, for the same reason Fill Mode itself has none: there's no
// real submittedAt to export until an actual Submit has created a FormResponse.
export function PreviewModal({ template, onClose }: { template: FormTemplate; onClose: () => void }) {
  const [values, setValues] = useState<FormValues>(() => {
    const initial: FormValues = {}
    for (const field of template.fields) {
      const definition = getFieldDefinition(field.config.type)
      initial[field.id] = definition.getInitialValue(field.config)
    }
    return initial
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/10 p-4">
          <h2 className="text-lg font-semibold text-ink">Preview — {template.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink"
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {template.fields.length === 0 ? (
            <p className="text-sm text-muted">Add a field to see a preview.</p>
          ) : (
            <FormRenderer
              fields={template.fields}
              values={values}
              onChange={(fieldId, value) => setValues((prev) => ({ ...prev, [fieldId]: value }))}
            />
          )}
        </div>
        <div className="border-t border-ink/10 p-4">
          <Button variant="primary" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  )
}
