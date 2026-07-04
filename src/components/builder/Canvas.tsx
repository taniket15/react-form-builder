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
import type { Condition, FormField } from '../../types'
import { getFieldDefinition } from '../../fields/registry'
import { Badge } from '../common/Badge'

interface CanvasProps {
  fields: FormField[]
  selectedFieldId: string | null
  onSelect: (fieldId: string) => void
  onRemove: (fieldId: string) => void
  onReorder: (orderedIds: string[]) => void
}

const EFFECT_TEXT: Record<Condition['effect'], string> = {
  show: 'Shown if',
  hide: 'Hidden if',
  require: 'Required if',
  unrequire: 'Optional if',
}

const OPERATOR_TEXT: Record<string, string> = {
  equals: '=',
  notEquals: '≠',
  contains: 'contains',
  greaterThan: '>',
  lessThan: '<',
  withinRange: 'within',
  before: 'before',
  after: 'after',
  containsAnyOf: 'any of',
  containsAllOf: 'all of',
  containsNoneOf: 'none of',
}

function describeValue(targetField: FormField | undefined, value: unknown): string {
  if (targetField?.config.type === 'singleSelect' || targetField?.config.type === 'multiSelect') {
    const options = targetField.config.options
    const lookup = (id: unknown) => options.find((o) => o.id === id)?.label ?? String(id)
    if (Array.isArray(value)) return value.map(lookup).join(', ')
    return value === undefined || value === null || value === '' ? '' : lookup(value)
  }
  if (value && typeof value === 'object' && 'min' in value && 'max' in value) {
    const range = value as { min: number; max: number }
    return `${range.min}–${range.max}`
  }
  if (Array.isArray(value)) return value.join(', ')
  return String(value ?? '')
}

// Read-only summary of the field's first condition, for a quick glance on the canvas —
// the ConditionsEditor (shown when the field is selected) is the source of truth for all rules.
function describeCondition(condition: Condition, allFields: FormField[]): string {
  const target = allFields.find((f) => f.id === condition.targetFieldId)
  const label = target?.config.label ?? 'field'
  const op = OPERATOR_TEXT[condition.operator] ?? condition.operator
  const value = describeValue(target, condition.value)
  return `${EFFECT_TEXT[condition.effect]} ${label} ${op} ${value}`.trim()
}

function CanvasItem({
  field,
  allFields,
  selected,
  onSelect,
  onRemove,
}: {
  field: FormField
  allFields: FormField[]
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })
  const definition = getFieldDefinition(field.config.type)
  const firstCondition = field.conditions[0]

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border p-2 ${
        selected ? 'border-[1.5px] border-ink/40 bg-surface-sunken' : 'border-ink/10 bg-surface'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 text-muted"
        aria-label="Drag to reorder"
      >
        ⠿
      </button>
      <button type="button" onClick={onSelect} className="flex flex-1 flex-wrap items-center gap-2 text-left">
        <span>{definition.icon}</span>
        <span className="text-sm font-medium text-ink">{field.config.label}</span>
        <span className="text-xs text-muted">{definition.label}</span>
        {field.config.required && <Badge variant="required">Required</Badge>}
        {firstCondition && (
          <Badge variant={firstCondition.effect === 'hide' ? 'hide' : 'show'}>
            {describeCondition(firstCondition, allFields)}
          </Badge>
        )}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="px-1 text-muted hover:text-danger"
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
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
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
              allFields={fields}
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
