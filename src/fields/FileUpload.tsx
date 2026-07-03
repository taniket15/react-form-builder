import type { ChangeEvent } from 'react'
import type { FileMeta, FileUploadConfig } from '../types'
import {
  registerField,
  type FieldConfigPanelProps,
  type FieldDefinition,
  type FieldFillProps,
} from './registry'

// Metadata only — no file content is stored or uploaded anywhere.
type Value = FileMeta[]

// Matching decision: allowedTypes matches by filename extension (case-insensitive),
// not MIME type, since this is metadata-only storage with no file content to sniff.
// The native `accept` attribute is a browser-level UX hint only, not authoritative —
// it's trivially bypassable, so the extension check re-validates after the picker returns.
function parseAllowedExtensions(allowedTypes?: string): string[] {
  if (!allowedTypes) return []
  return allowedTypes
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
    .map((s) => (s.startsWith('.') ? s : `.${s}`))
}

function hasAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
  if (allowedExtensions.length === 0) return true
  const lower = filename.toLowerCase()
  return allowedExtensions.some((ext) => lower.endsWith(ext))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function createDefaultConfig(): FileUploadConfig {
  return {
    type: 'fileUpload',
    label: 'File Upload',
    required: false,
  }
}

function ConfigPanel({ config, onChange }: FieldConfigPanelProps<FileUploadConfig>) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Label
        <input
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
          value={config.label}
          onChange={(e) => onChange({ ...config, label: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={config.required}
          onChange={(e) => onChange({ ...config, required: e.target.checked })}
        />
        Required
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Allowed file types (comma-separated, e.g. .pdf,.jpg,.png)
        <input
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
          value={config.allowedTypes ?? ''}
          onChange={(e) => onChange({ ...config, allowedTypes: e.target.value })}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Max number of files
        <input
          type="number"
          min={1}
          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
          value={config.maxFiles ?? ''}
          onChange={(e) =>
            onChange({
              ...config,
              maxFiles: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
      </label>
    </div>
  )
}

function FillField({ config, value, onChange, error }: FieldFillProps<FileUploadConfig, Value>) {
  const allowedExtensions = parseAllowedExtensions(config.allowedTypes)

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const incoming: FileMeta[] = Array.from(files)
      .filter((f) => hasAllowedExtension(f.name, allowedExtensions))
      .map((f) => ({ name: f.name, size: f.size, type: f.type }))
    const combined = [...value, ...incoming]
    const limited = config.maxFiles !== undefined ? combined.slice(0, config.maxFiles) : combined
    onChange(limited)
    e.target.value = ''
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {config.label}
        {config.required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type="file"
        multiple={config.maxFiles === undefined || config.maxFiles > 1}
        accept={config.allowedTypes}
        onChange={handleFileInput}
        className="mt-1 block text-sm"
      />
      {value.length > 0 && (
        <ul className="mt-2 space-y-1">
          {value.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded border border-slate-200 px-2 py-1 text-sm"
            >
              <span>
                {file.name} ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-slate-400 hover:text-red-500"
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

function validate(value: Value, config: FileUploadConfig): string | null {
  if (config.required && value.length === 0) return `${config.label} is required`
  if (config.maxFiles !== undefined && value.length > config.maxFiles) {
    return `${config.label} allows at most ${config.maxFiles} file(s)`
  }
  return null
}

export const fileUploadDefinition: FieldDefinition<FileUploadConfig, Value> = {
  type: 'fileUpload',
  label: 'File Upload',
  icon: '📎',
  createDefaultConfig,
  ConfigPanel,
  FillField,
  getInitialValue: () => [],
  validate,
  // No conditionOperators — File Upload is excluded from condition targets (§1).
  formatForDisplay: (value) => {
    if (value.length === 0) return '(no files)'
    return value.map((f) => `${f.name} (${formatFileSize(f.size)}) — file not embedded`).join('; ')
  },
}

registerField(fileUploadDefinition)
