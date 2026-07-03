import type { FormField, FormTemplate } from '../types'

// This reducer owns the Builder page's in-memory DRAFT only — it never touches
// TemplatesContext. Save is the one moment the draft is committed (see BuilderPage).
export type BuilderAction =
  | { type: 'SET_TITLE'; title: string }
  | { type: 'ADD_FIELD'; field: FormField }
  | { type: 'UPDATE_FIELD'; field: FormField }
  | { type: 'REMOVE_FIELD'; fieldId: string }
  | { type: 'REORDER_FIELDS'; orderedIds: string[] }

export function builderReducer(state: FormTemplate, action: BuilderAction): FormTemplate {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.title }
    case 'ADD_FIELD':
      return { ...state, fields: [...state.fields, action.field] }
    case 'UPDATE_FIELD':
      return {
        ...state,
        fields: state.fields.map((f) => (f.id === action.field.id ? action.field : f)),
      }
    case 'REMOVE_FIELD':
      return { ...state, fields: state.fields.filter((f) => f.id !== action.fieldId) }
    case 'REORDER_FIELDS': {
      const byId = new Map(state.fields.map((f) => [f.id, f]))
      const reordered = action.orderedIds
        .map((id) => byId.get(id))
        .filter((f): f is FormField => f !== undefined)
      return { ...state, fields: reordered }
    }
  }
}

export function createBlankTemplate(): FormTemplate {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Template',
    fields: [],
    createdAt: now,
    updatedAt: now,
  }
}
