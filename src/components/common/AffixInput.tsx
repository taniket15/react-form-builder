import type { ReactNode } from 'react'

export function AffixWrapper({
  prefix,
  suffix,
  children,
}: {
  prefix?: string
  suffix?: string
  children: ReactNode
}) {
  return (
    <div className="mt-1 flex items-stretch">
      {prefix && <span className="field-input-addon rounded-l-[10px] border-r-0">{prefix}</span>}
      {children}
      {suffix && <span className="field-input-addon rounded-r-[10px] border-l-0">{suffix}</span>}
    </div>
  )
}
