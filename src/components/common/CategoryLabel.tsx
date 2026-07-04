import type { ReactNode } from 'react'

export function CategoryLabel({ children }: { children: ReactNode }) {
  return <div className="category-label">{children}</div>
}
