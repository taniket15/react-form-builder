import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { FormTemplate } from '../types'
import { loadTemplates, saveTemplates } from '../storage/localStorage'

// Collection CRUD only — deliberately no per-field actions (addField, updateFieldConfig,
// addCondition, etc). Field editing happens on a local draft in the Builder page's own
// reducer; this context only ever sees a complete template at create/update/delete time,
// so it can persist on every change without turning every keystroke into a save.
type TemplatesAction =
  | { type: 'CREATE'; template: FormTemplate }
  | { type: 'UPDATE'; template: FormTemplate }
  | { type: 'DELETE'; id: string }

function templatesReducer(
  state: FormTemplate[],
  action: TemplatesAction,
): FormTemplate[] {
  switch (action.type) {
    case 'CREATE':
      return [...state, action.template]
    case 'UPDATE':
      return state.map((t) => (t.id === action.template.id ? action.template : t))
    case 'DELETE':
      return state.filter((t) => t.id !== action.id)
  }
}

interface TemplatesContextValue {
  templates: FormTemplate[]
  createTemplate: (template: FormTemplate) => void
  updateTemplate: (template: FormTemplate) => void
  deleteTemplate: (id: string) => void
}

const TemplatesContext = createContext<TemplatesContextValue | null>(null)

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, dispatch] = useReducer(templatesReducer, undefined, loadTemplates)

  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  const value: TemplatesContextValue = {
    templates,
    createTemplate: (template) => dispatch({ type: 'CREATE', template }),
    updateTemplate: (template) => dispatch({ type: 'UPDATE', template }),
    deleteTemplate: (id) => dispatch({ type: 'DELETE', id }),
  }

  return (
    <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
  )
}

export function useTemplates(): TemplatesContextValue {
  const ctx = useContext(TemplatesContext)
  if (!ctx) throw new Error('useTemplates must be used within a TemplatesProvider')
  return ctx
}
