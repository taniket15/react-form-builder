import { useNavigate } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { useResponses } from '../context/ResponsesContext'
import { formatDateTime } from '../utils/formatDateTime'
import { Button } from '../components/common/Button'

export function TemplatesListPage() {
  const navigate = useNavigate()
  const { templates } = useTemplates()
  const { responses } = useResponses()

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Your forms</h1>
        <Button variant="primary" onClick={() => navigate('/builder/new')}>
          + New template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-ink/10 bg-surface p-10 text-center">
          <p className="font-medium text-ink">No forms yet</p>
          <p className="mt-1 text-sm text-muted">
            Create your first template and start collecting responses.
          </p>
          <Button variant="primary" className="mt-4" onClick={() => navigate('/builder/new')}>
            + New template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {templates.map((template) => {
            const responseCount = responses.filter((r) => r.templateId === template.id).length
            return (
              // A div, not a button — it wraps two real buttons below, and
              // button-in-button isn't valid HTML.
              <div
                key={template.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/builder/${template.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/builder/${template.id}`)
                }}
                className="cursor-pointer rounded-xl border border-ink/10 bg-surface p-4 text-left transition-colors hover:border-primary/50 hover:shadow-sm"
              >
                <h2 className="font-semibold text-ink">{template.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {template.fields.length} field{template.fields.length === 1 ? '' : 's'} · {responseCount}{' '}
                  response{responseCount === 1 ? '' : 's'}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Last modified {formatDateTime(template.updatedAt)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/fill/${template.id}`)
                    }}
                  >
                    New response
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/template/${template.id}/responses`)
                    }}
                  >
                    Responses
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
