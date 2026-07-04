import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { useResponses } from '../context/ResponsesContext'
import { getFieldDefinition } from '../fields/registry'
import { FormRenderer } from '../components/fill/FormRenderer'
import { computeVisibleEntries, validateEntries } from '../engine/visibility'
import { exportResponseToPdf } from '../pdf/exportPdf'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { BackLink } from '../components/common/BackLink'
import type { FormResponse, FormValues } from '../types'

export function FillPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { templates } = useTemplates()
  const { createResponse } = useResponses()

  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  )

  const [values, setValues] = useState<FormValues>(() => {
    if (!template) return {}
    const initial: FormValues = {}
    for (const field of template.fields) {
      const definition = getFieldDefinition(field.config.type)
      initial[field.id] = definition.getInitialValue(field.config)
    }
    return initial
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Download PDF stays disabled until a real FormResponse exists — the PDF must
  // include a genuine submission timestamp, which doesn't exist pre-submit.
  const [submittedResponse, setSubmittedResponse] = useState<FormResponse | null>(null)

  useEffect(() => {
    if (template === undefined) {
      navigate('/', { replace: true })
    }
  }, [template, navigate])

  if (!template) return null

  function handleChange(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }))
    setErrors((prev) => {
      if (!(fieldId in prev)) return prev
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }

  function handleSubmit() {
    if (!template) return

    const { entries, fieldStates } = computeVisibleEntries(template.fields, values)
    const validationErrors = validateEntries(entries, fieldStates)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    const submissionValues: FormValues = {}
    for (const entry of entries) {
      submissionValues[entry.field.id] = entry.value
    }

    const response: FormResponse = {
      id: crypto.randomUUID(),
      templateId: template.id,
      templateSnapshot: structuredClone(template),
      values: submissionValues,
      submittedAt: new Date().toISOString(),
    }
    createResponse(response)
    setSubmittedResponse(response)
  }

  const errorCount = Object.keys(errors).length

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="mb-4">
        <BackLink />
      </div>
      <h1 className="text-2xl font-semibold text-ink">{template.title}</h1>
      <p className="mb-4 text-sm text-muted">
        Fields marked <span className="field-required-mark">*</span> are required.
      </p>

      {errorCount > 0 && (
        <div className="mb-4 rounded-[10px] border border-danger/30 bg-danger-tint px-3 py-2 text-sm font-medium text-danger">
          {errorCount} field{errorCount === 1 ? '' : 's'} {errorCount === 1 ? 'needs' : 'need'} your attention
          before you can submit.
        </div>
      )}

      <FormRenderer fields={template.fields} values={values} onChange={handleChange} errors={errors} />

      {submittedResponse && (
        <p className="mt-4">
          <Badge variant="show">Submitted ✓</Badge>
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Button variant="primary" onClick={handleSubmit}>
          Submit
        </Button>
        <Button
          disabled={!submittedResponse}
          title={submittedResponse ? undefined : 'Submit the form first'}
          onClick={() => submittedResponse && exportResponseToPdf(submittedResponse)}
        >
          Download PDF
        </Button>
      </div>
    </div>
  )
}
