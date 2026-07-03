import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { useResponses } from '../context/ResponsesContext'
import { getFieldDefinition } from '../fields/registry'
import { FormRenderer } from '../components/fill/FormRenderer'
import { computeVisibleEntries, validateEntries } from '../engine/visibility'
import { Button } from '../components/common/Button'
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
    navigate(`/template/${template.id}/responses`)
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">{template.title}</h1>
      <FormRenderer fields={template.fields} values={values} onChange={handleChange} errors={errors} />
      <Button variant="primary" onClick={handleSubmit} className="mt-4">
        Submit
      </Button>
    </div>
  )
}
