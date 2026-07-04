import type { ReactNode } from 'react'

export type BadgeVariant = 'required' | 'show' | 'hide' | 'count' | 'today' | 'calc'

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  required: 'bg-danger-tint text-danger',
  show: 'bg-success-tint text-success',
  hide: 'bg-danger-tint text-danger',
  count: 'bg-surface-sunken text-ink-soft',
  today: 'bg-primary-tint text-primary',
  calc: 'bg-calc-tint text-calc',
}

export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  )
}
