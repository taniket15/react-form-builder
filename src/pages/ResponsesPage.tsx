import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { useResponses } from '../context/ResponsesContext'
import { formatDateTime } from '../utils/formatDateTime'
import { exportResponseToPdf } from '../pdf/exportPdf'
import { Button } from '../components/common/Button'

export function ResponsesPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { templates } = useTemplates()
  const { responses } = useResponses()

  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  )
  const templateResponses = useMemo(
    () =>
      responses
        .filter((r) => r.templateId === templateId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [responses, templateId],
  )

  useEffect(() => {
    if (template === undefined) {
      navigate('/', { replace: true })
    }
  }, [template, navigate])

  if (!template) return null

  return (
    <div className="mx-auto max-w-2xl p-6">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Back to Templates
      </button>
      <h1 className="mb-1 text-2xl font-semibold">{template.title}</h1>
      <p className="mb-4 text-sm text-slate-500">{templateResponses.length} response(s)</p>

      {templateResponses.length === 0 ? (
        <p className="text-slate-500">
          No responses yet. Use "New Response" from the templates list to fill this form out.
        </p>
      ) : (
        <ul className="space-y-2">
          {templateResponses.map((response) => (
            <li
              key={response.id}
              className="flex items-center justify-between rounded border border-slate-200 p-3"
            >
              <span className="text-sm">{formatDateTime(response.submittedAt)}</span>
              <Button onClick={() => exportResponseToPdf(response)}>Download PDF</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
