import { useParams } from 'react-router-dom'

export function BuilderPage() {
  const { templateId } = useParams()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Builder</h1>
      <p className="mt-2 text-slate-500">
        {templateId === undefined || templateId === 'new'
          ? 'New template (placeholder).'
          : `Editing template ${templateId} (placeholder).`}
      </p>
    </div>
  )
}
