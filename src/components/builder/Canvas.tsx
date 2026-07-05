import { memo, useMemo } from 'react'
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
import { Badge, type BadgeVariant } from '../common/Badge'

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

// Same colors as the ConditionsEditor's effect pill (show=green, hide/require=danger-ish,
// unrequire=neutral) — kept in sync so the canvas chip matches the editor's own styling.
const EFFECT_BADGE_VARIANT: Record<Condition['effect'], BadgeVariant> = {
  show: 'show',
  hide: 'hide',
  require: 'require',
  unrequire: 'optional',
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
  if (targetField?.config.type === 'date') {
    if (typeof value !== 'string' || value === '') return ''
    // Reuse the field's own formatter so the chip's date matches Fill/PDF/Responses
    // (e.g. locale-formatted "7/4/2026"), instead of the raw stored ISO string.
    return getFieldDefinition('date').formatForDisplay?.(value, targetField.config) ?? value
  }
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
// Takes the already-resolved target field (not the full field list) so a CanvasItem
// only needs that one field as a prop, instead of the whole array — see below.
function describeCondition(condition: Condition, target: FormField | undefined): string {
  const label = target?.config.label ?? 'field'
  const op = OPERATOR_TEXT[condition.operator] ?? condition.operator
  const value = describeValue(target, condition.value)
  return `${EFFECT_TEXT[condition.effect]} ${label} ${op} ${value}`.trim()
}

// Memoized so editing one field's config only re-renders that field's own row (and
// any row whose condition targets it), not every row on the canvas. This only works
// because every prop here is reference-stable for unrelated fields: `field` and
// `conditionTarget` come from builderReducer's `fields.map(...)`, which reuses the
// same object for every field it isn't replacing, and `onSelect`/`onRemove` are the
// stable callbacks forwarded straight from Canvas's own props (see below) rather
// than new closures created per row.
const CanvasItem = memo(function CanvasItem({
  field,
  conditionTarget,
  selected,
  onSelect,
  onRemove,
}: {
  field: FormField
  conditionTarget?: FormField
  selected: boolean
  onSelect: (fieldId: string) => void
  onRemove: (fieldId: string) => void
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
      <button
        type="button"
        onClick={() => onSelect(field.id)}
        className="flex flex-1 flex-wrap items-center gap-2 text-left"
      >
        <span>{definition.icon}</span>
        <span className="text-sm font-medium text-ink">{field.config.label}</span>
        <span className="text-xs text-muted">{definition.label}</span>
        {field.config.required && <Badge variant="required">Required</Badge>}
        {firstCondition && (
          <Badge variant={EFFECT_BADGE_VARIANT[firstCondition.effect]}>
            {describeCondition(firstCondition, conditionTarget)}
          </Badge>
        )}
      </button>
      <button
        type="button"
        onClick={() => onRemove(field.id)}
        className="px-1 text-muted hover:text-danger"
        aria-label="Remove field"
      >
        ✕
      </button>
    </div>
  )
})

export function Canvas({ fields, selectedFieldId, onSelect, onRemove, onReorder }: CanvasProps) {
  const sensors = useSensors(useSensor(PointerSensor))

  // Individual FormField objects keep their identity across renders for every field
  // that isn't the one being edited (see builderReducer's UPDATE_FIELD). Looking up
  // a condition's target through this map — instead of handing each CanvasItem the
  // whole `fields` array — means an edit to field A only changes the `conditionTarget`
  // prop for rows whose condition actually targets A.
  const fieldsById = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields])

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
              conditionTarget={
                field.conditions[0] ? fieldsById.get(field.conditions[0].targetFieldId) : undefined
              }
              selected={field.id === selectedFieldId}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
