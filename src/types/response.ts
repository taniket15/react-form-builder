import type { FormTemplate } from './template'

export type FormValues = Record<string, unknown>

/**
 * `templateSnapshot` is the entire FormTemplate (structuredClone'd at submit time),
 * not a hand-picked subset — a submission must reflect the exact template that
 * produced it, even after the live template is edited or re-shaped later.
 */
export interface FormResponse {
  id: string
  templateId: string
  templateSnapshot: FormTemplate
  values: FormValues
  submittedAt: string
}
