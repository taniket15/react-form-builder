import { useNavigate } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { useInstances } from '../context/InstancesContext'

export function TemplatesListPage() {
  const navigate = useNavigate()
  const { templates } = useTemplates()
  const { instances } = useInstances()

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Templates</h1>
        <button
          type="button"
          onClick={() => navigate('/builder/new')}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="text-slate-500">No templates yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {templates.map((template) => {
            const instanceCount = instances.filter((i) => i.templateId === template.id).length
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => navigate(`/builder/${template.id}`)}
                className="rounded border border-slate-200 p-4 text-left hover:border-blue-400 hover:shadow"
              >
                <h2 className="font-medium">{template.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{template.fields.length} field(s)</p>
                <p className="text-sm text-slate-500">{instanceCount} response(s)</p>
                <p className="mt-2 text-xs text-slate-400">
                  Last modified {new Date(template.updatedAt).toLocaleString()}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
