import type { FormResponse, FormTemplate } from '../types'

const KEYS = {
  templates: 'formbuilder:v1:templates',
  responses: 'formbuilder:v1:responses',
  schemaVersion: 'formbuilder:v1:schemaVersion',
} as const

const SCHEMA_VERSION = 1

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    localStorage.setItem(KEYS.schemaVersion, String(SCHEMA_VERSION))
  } catch {
    // localStorage unavailable (private browsing, quota exceeded, etc.) —
    // in-memory state still works for the current session.
  }
}

export function loadTemplates(): FormTemplate[] {
  return readJSON<FormTemplate[]>(KEYS.templates, [])
}

export function saveTemplates(templates: FormTemplate[]): void {
  writeJSON(KEYS.templates, templates)
}

export function loadResponses(): FormResponse[] {
  return readJSON<FormResponse[]>(KEYS.responses, [])
}

export function saveResponses(responses: FormResponse[]): void {
  writeJSON(KEYS.responses, responses)
}
