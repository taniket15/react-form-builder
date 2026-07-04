import { useNavigate } from 'react-router-dom'

export function BackLink({ to = '/', label = '← Back to Templates' }: { to?: string; label?: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(to)} className="text-sm text-primary hover:underline">
      {label}
    </button>
  )
}
