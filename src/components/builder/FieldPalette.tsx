import type { FieldType } from '../../types'
import { getAllFieldDefinitions } from '../../fields/registry'
import { CategoryLabel } from '../common/CategoryLabel'

export function FieldPalette({ onAddField }: { onAddField: (type: FieldType) => void }) {
  const definitions = getAllFieldDefinitions()

  return (
    <div className="w-56 shrink-0 overflow-y-auto border-r border-ink/10 bg-surface-sunken p-3">
      <CategoryLabel>Add a field</CategoryLabel>
      <div className="mt-2 space-y-1">
        {definitions.map((definition) => (
          <button
            key={definition.type}
            type="button"
            onClick={() => onAddField(definition.type)}
            className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-sm text-ink hover:bg-surface"
          >
            <span>{definition.icon}</span>
            <span>{definition.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
