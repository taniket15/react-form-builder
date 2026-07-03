import type { FormField } from './field'

export interface FormTemplate {
  id: string
  title: string
  fields: FormField[]
  createdAt: string
  updatedAt: string
}
