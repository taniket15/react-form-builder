import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { builderReducer, createBlankTemplate } from '../builder/builderReducer'
import { getFieldDefinition } from '../fields/registry'
import { FieldPalette } from '../components/builder/FieldPalette'
import { Canvas } from '../components/builder/Canvas'
import { DefaultVisibilityToggle } from '../components/builder/DefaultVisibilityToggle'
import { ConditionsEditor } from '../components/builder/ConditionsEditor'
import { PreviewModal } from '../components/builder/PreviewModal'
import { Button } from '../components/common/Button'
import { BackLink } from '../components/common/BackLink'
import type { FieldType, FormField } from '../types'

export function BuilderPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { templates, createTemplate, updateTemplate } = useTemplates()

  const isNew = templateId === undefined || templateId === 'new'
  const existingTemplate = useMemo(
    () => (isNew ? undefined : templates.find((t) => t.id === templateId)),
    [isNew, templates, templateId],
  )

  const [draft, dispatch] = useReducer(builderReducer, undefined, () =>
    existingTemplate ? structuredClone(existingTemplate) : createBlankTemplate(),
  )
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saveAttempted, setSaveAttempted] = useState(false)

  // Label is required on every field type (it's a BaseConfig property, so this check
  // applies uniformly across all 9 registry types with no per-type special-casing).
  const emptyLabelFields = draft.fields.filter((f) => f.config.label.trim() === '')
  const titleError = saveAttempted && draft.title.trim() === '' ? 'Title is required' : undefined

  useEffect(() => {
    if (!isNew && existingTemplate === undefined) {
      navigate('/', { replace: true })
    }
  }, [isNew, existingTemplate, navigate])

  const selectedField = draft.fields.find((f) => f.id === selectedFieldId) ?? null

  function handleAddField(type: FieldType) {
    const definition = getFieldDefinition(type)
    const field: FormField = {
      id: crypto.randomUUID(),
      config: definition.createDefaultConfig(),
      conditions: [],
      defaultVisible: true,
    }
    dispatch({ type: 'ADD_FIELD', field })
    setSelectedFieldId(field.id)
  }

  // Stable across renders (no deps) so Canvas's memoized rows don't all invalidate
  // on every keystroke elsewhere on the page — see Canvas.tsx's CanvasItem.
  const handleRemoveField = useCallback((fieldId: string) => {
    dispatch({ type: 'REMOVE_FIELD', fieldId })
    setSelectedFieldId((prev) => (prev === fieldId ? null : prev))
  }, [])

  function handleSave() {
    setSaveAttempted(true)
    if (draft.title.trim() === '') {
      return
    }
    const firstInvalid = emptyLabelFields[0]
    if (firstInvalid) {
      setSelectedFieldId(firstInvalid.id)
      return
    }

    const toSave = { ...draft, updatedAt: new Date().toISOString() }
    if (isNew) {
      createTemplate(toSave)
      navigate(`/builder/${toSave.id}`, { replace: true })
    } else {
      updateTemplate(toSave)
    }
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center gap-3 border-b border-ink/10 bg-surface p-3">
        <BackLink />
        <div className="flex-1">
          <input
            className="field-input w-full text-lg font-semibold"
            value={draft.title}
            aria-invalid={!!titleError}
            onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })}
          />
          {titleError && <p className="field-error">{titleError}</p>}
        </div>
        {/* Only shown once the template has been saved at least once — a /builder/new
            draft has no id to link to yet. */}
        {!isNew && (
          <button
            type="button"
            onClick={() => navigate(`/template/${draft.id}/responses`)}
            className="text-sm text-primary hover:underline"
          >
            View Responses
          </button>
        )}
        <Button onClick={() => setPreviewOpen(true)}>Preview</Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <FieldPalette onAddField={handleAddField} />
        <Canvas
          fields={draft.fields}
          selectedFieldId={selectedFieldId}
          onSelect={setSelectedFieldId}
          onRemove={handleRemoveField}
          onReorder={(orderedIds) => dispatch({ type: 'REORDER_FIELDS', orderedIds })}
        />
        <div className="w-80 shrink-0 overflow-y-auto border-l border-ink/10 bg-surface-sunken p-3">
          {selectedField ? (
            <ConfigPanelHost
              field={selectedField}
              allFields={draft.fields}
              labelError={
                saveAttempted && selectedField.config.label.trim() === '' ? 'Label is required' : undefined
              }
              onChange={(field) => dispatch({ type: 'UPDATE_FIELD', field })}
            />
          ) : (
            <p className="text-sm text-muted">Select a field to configure it.</p>
          )}
        </div>
      </div>
      {previewOpen && <PreviewModal template={draft} onClose={() => setPreviewOpen(false)} />}
    </div>
  )
}

function ConfigPanelHost({
  field,
  allFields,
  labelError,
  onChange,
}: {
  field: FormField
  allFields: FormField[]
  labelError?: string
  onChange: (field: FormField) => void
}) {
  const definition = getFieldDefinition(field.config.type)
  const ConfigPanel = definition.ConfigPanel
  return (
    <div className="space-y-4">
      <ConfigPanel
        config={field.config}
        onChange={(config) => onChange({ ...field, config })}
        ctx={{ allFields, labelError }}
      />
      <DefaultVisibilityToggle
        defaultVisible={field.defaultVisible}
        onChange={(defaultVisible) => onChange({ ...field, defaultVisible })}
      />
      <ConditionsEditor
        field={field}
        allFields={allFields}
        onChange={(conditions) => onChange({ ...field, conditions })}
      />
    </div>
  )
}
