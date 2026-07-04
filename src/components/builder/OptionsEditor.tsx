import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SelectOption } from '../../types'

interface OptionsEditorProps {
  options: SelectOption[]
  onChange: (options: SelectOption[]) => void
}

function OptionRow({
  option,
  onLabelChange,
  onRemove,
}: {
  option: SelectOption
  onLabelChange: (label: string) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 text-muted"
        aria-label="Drag to reorder option"
      >
        ⠿
      </button>
      <input
        className="field-input flex-1"
        value={option.label}
        onChange={(e) => onLabelChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onRemove}
        className="px-1 text-muted hover:text-danger"
        aria-label="Remove option"
      >
        ✕
      </button>
    </div>
  )
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = options.findIndex((o) => o.id === active.id)
    const newIndex = options.findIndex((o) => o.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(options, oldIndex, newIndex))
  }

  function handleAdd() {
    onChange([...options, { id: crypto.randomUUID(), label: `Option ${options.length + 1}` }])
  }

  return (
    <div className="space-y-2">
      <span className="field-label">Options</span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                onLabelChange={(label) =>
                  onChange(options.map((o) => (o.id === option.id ? { ...o, label } : o)))
                }
                onRemove={() => onChange(options.filter((o) => o.id !== option.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={handleAdd} className="text-sm text-primary hover:underline">
        + Add option
      </button>
    </div>
  )
}
