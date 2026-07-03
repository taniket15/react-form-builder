import { useParams } from 'react-router-dom'

export function FillPage() {
  const { templateId } = useParams()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Fill</h1>
      <p className="mt-2 text-slate-500">Filling template {templateId} (placeholder).</p>
    </div>
  )
}
