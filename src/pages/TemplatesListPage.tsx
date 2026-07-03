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
        <h1 className="text-2xl font-semibold">Templates</h1>
        <Button variant="primary" onClick={() => navigate('/builder/new')}>
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-slate-500">No templates yet. Click "New Template" to build your first form.</p>
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
                className="cursor-pointer rounded border border-slate-200 p-4 text-left hover:border-blue-400 hover:shadow"
              >
                <h2 className="font-medium">{template.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{template.fields.length} field(s)</p>
                <p className="text-sm text-slate-500">{responseCount} response(s)</p>
                <p className="mt-2 text-xs text-slate-400">
                  Last modified {formatDateTime(template.updatedAt)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/fill/${template.id}`)
                    }}
                  >
                    New Response
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/template/${template.id}/responses`)
                    }}
                  >
                    View Responses
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
