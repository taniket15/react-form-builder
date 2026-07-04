import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { useResponses } from '../context/ResponsesContext'
import { formatDateTime } from '../utils/formatDateTime'
import { exportResponseToPdf } from '../pdf/exportPdf'
import { Button } from '../components/common/Button'
import { ResponsePreviewModal } from '../components/responses/ResponsePreviewModal'
import type { FormResponse } from '../types'

export function ResponsesPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { templates } = useTemplates()
  const { responses } = useResponses()

  const [previewResponse, setPreviewResponse] = useState<FormResponse | null>(null)

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
        className="mb-4 text-sm text-primary hover:underline"
      >
        ← Back to Templates
      </button>
      <h1 className="mb-1 text-2xl font-semibold text-ink">{template.title}</h1>
      <p className="mb-4 text-sm text-muted">{templateResponses.length} response(s)</p>

      {templateResponses.length === 0 ? (
        <div className="rounded-xl border border-ink/10 bg-surface p-10 text-center">
          <p className="font-medium text-ink">No responses yet</p>
          <p className="mt-1 text-sm text-muted">
            Share the form or add a response to see submissions here.
          </p>
          <Button variant="primary" className="mt-4" onClick={() => navigate(`/fill/${template.id}`)}>
            + New response
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {templateResponses.map((response) => (
            <li
              key={response.id}
              className="flex items-center justify-between rounded-xl border border-ink/10 bg-surface p-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
                    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.58-5-8-5Z" />
                  </svg>
                </span>
                <p className="text-xs text-muted">{formatDateTime(response.submittedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setPreviewResponse(response)}>Preview</Button>
                <Button onClick={() => exportResponseToPdf(response)}>↓ PDF</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {previewResponse && (
        <ResponsePreviewModal response={previewResponse} onClose={() => setPreviewResponse(null)} />
      )}
    </div>
  )
}
