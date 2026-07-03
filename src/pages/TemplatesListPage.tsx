import { useTemplates } from '../context/TemplatesContext'

export function TemplatesListPage() {
  const { templates } = useTemplates()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Templates</h1>
      <p className="mt-2 text-slate-500">
        {templates.length === 0
          ? 'No templates yet.'
          : `${templates.length} template(s) saved.`}
      </p>
    </div>
  )
}
