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
import type { FormField } from '../../types'
import { getFieldDefinition } from '../../fields/registry'

interface CanvasProps {
  fields: FormField[]
  selectedFieldId: string | null
  onSelect: (fieldId: string) => void
  onRemove: (fieldId: string) => void
  onReorder: (orderedIds: string[]) => void
}

function CanvasItem({
  field,
  selected,
  onSelect,
  onRemove,
}: {
  field: FormField
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })
  const definition = getFieldDefinition(field.config.type)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded border p-2 ${
        selected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 text-slate-400"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <button type="button" onClick={onSelect} className="flex-1 text-left">
        <span className="mr-2">{definition.icon}</span>
        <span className="text-sm font-medium">{field.config.label}</span>
        <span className="ml-2 text-xs text-slate-400">{definition.label}</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="px-1 text-slate-400 hover:text-red-500"
        aria-label="Remove field"
      >
        ✕
      </button>
    </div>
  )
}

export function Canvas({ fields, selectedFieldId, onSelect, onRemove, onReorder }: CanvasProps) {
  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = fields.findIndex((f) => f.id === active.id)
    const newIndex = fields.findIndex((f) => f.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(fields, oldIndex, newIndex)
    onReorder(reordered.map((f) => f.id))
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
        Add a field from the left to get started.
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {fields.map((field) => (
            <CanvasItem
              key={field.id}
              field={field}
              selected={field.id === selectedFieldId}
              onSelect={() => onSelect(field.id)}
              onRemove={() => onRemove(field.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
