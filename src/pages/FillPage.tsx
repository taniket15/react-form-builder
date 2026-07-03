import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { getFieldDefinition } from '../fields/registry'
import { FormRenderer } from '../components/fill/FormRenderer'
import type { FormValues } from '../types'

export function FillPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { templates } = useTemplates()

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

  useEffect(() => {
    if (template === undefined) {
      navigate('/', { replace: true })
    }
  }, [template, navigate])

  if (!template) return null

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">{template.title}</h1>
      <FormRenderer
        fields={template.fields}
        values={values}
        onChange={(fieldId, value) => setValues((prev) => ({ ...prev, [fieldId]: value }))}
      />
    </div>
  )
}
