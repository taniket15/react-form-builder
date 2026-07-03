import type { FieldType } from '../../types'
import { getAllFieldDefinitions } from '../../fields/registry'

export function FieldPalette({ onAddField }: { onAddField: (type: FieldType) => void }) {
  const definitions = getAllFieldDefinitions()

  return (
    <div className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 p-3">
      <h2 className="mb-2 text-sm font-semibold text-slate-500">Add a field</h2>
      <div className="space-y-1">
        {definitions.map((definition) => (
          <button
            key={definition.type}
            type="button"
            onClick={() => onAddField(definition.type)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
          >
            <span>{definition.icon}</span>
            <span>{definition.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
