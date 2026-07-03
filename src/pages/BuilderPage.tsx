import { useEffect, useMemo, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTemplates } from '../context/TemplatesContext'
import { builderReducer, createBlankTemplate } from '../builder/builderReducer'
import { getFieldDefinition } from '../fields/registry'
import { FieldPalette } from '../components/builder/FieldPalette'
import { Canvas } from '../components/builder/Canvas'
import { DefaultVisibilityToggle } from '../components/builder/DefaultVisibilityToggle'
import { ConditionsEditor } from '../components/builder/ConditionsEditor'
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

  function handleSave() {
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
      <header className="flex items-center gap-3 border-b border-slate-200 p-3">
        <input
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-lg font-semibold"
          value={draft.title}
          onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })}
        />
        {/* Only shown once the template has been saved at least once — a /builder/new
            draft has no id to link to yet. */}
        {!isNew && (
          <button
            type="button"
            onClick={() => navigate(`/template/${draft.id}/responses`)}
            className="text-sm text-blue-600 hover:underline"
          >
            View Responses
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Save
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <FieldPalette onAddField={handleAddField} />
        <Canvas
          fields={draft.fields}
          selectedFieldId={selectedFieldId}
          onSelect={setSelectedFieldId}
          onRemove={(fieldId) => {
            dispatch({ type: 'REMOVE_FIELD', fieldId })
            if (selectedFieldId === fieldId) setSelectedFieldId(null)
          }}
          onReorder={(orderedIds) => dispatch({ type: 'REORDER_FIELDS', orderedIds })}
        />
        <div className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 p-3">
          {selectedField ? (
            <ConfigPanelHost
              field={selectedField}
              allFields={draft.fields}
              onChange={(field) => dispatch({ type: 'UPDATE_FIELD', field })}
            />
          ) : (
            <p className="text-sm text-slate-400">Select a field to configure it.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfigPanelHost({
  field,
  allFields,
  onChange,
}: {
  field: FormField
  allFields: FormField[]
  onChange: (field: FormField) => void
}) {
  const definition = getFieldDefinition(field.config.type)
  const ConfigPanel = definition.ConfigPanel
  return (
    <div className="space-y-4">
      <ConfigPanel
        config={field.config}
        onChange={(config) => onChange({ ...field, config })}
        ctx={{ allFields }}
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
