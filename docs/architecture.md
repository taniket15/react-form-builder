# Architecture

Where things live, and the two patterns that make this app easy to extend. For the reasoning behind each decision, see [`decisions.md`](decisions.md) — this doc is just the shape.

## Layers

```
types/       shared TypeScript types, no React
fields/      one file per field type, plus the registry (see below)
engine/      pure functions for conditions, calculations, validation — no React, unit-tested
storage/     localStorage read/write
context/     TemplatesContext, ResponsesContext — simple CRUD
builder/     the Builder page's in-progress draft (unsaved edits live here, not in context)
components/  builder/, fill/, common/ — shared UI pieces
pages/       one file per route
pdf/         PDF export (browser-native, no library)
```

Data flows one way:

```
pages  →  components  →  fields / engine  →  types
```

The engine and field files don't know about pages or components — that's what keeps them easy to test.

## Data model

```ts
interface FormTemplate {
  id: string
  title: string
  fields: FormField[]
  createdAt: string
  updatedAt: string
}

interface FormField {
  id: string
  config: FieldConfig        // 9 variants, one per field type, discriminated on config.type
  conditions: Condition[]
  defaultVisible: boolean
}

interface BaseConfig {       // every FieldConfig variant extends this
  label: string
  required: boolean          // always false for Section Header / Calculation, no second flag
}

interface Condition {
  id: string
  targetFieldId: string      // another field on the same template — never itself
  operator: ConditionOperator  // 'equals' | 'contains' | 'isWithinRange' | ... — set depends on the target field's type
  value: unknown
  effect: 'show' | 'hide' | 'require' | 'unrequire'
}

interface FormResponse {
  id: string
  templateId: string
  templateSnapshot: FormTemplate   // full clone at submit time, not a hand-picked subset
  values: Record<string, unknown>  // only visible fields' ids are present as keys
  submittedAt: string
}
```

`config.type` is the only discriminant on `FormField` — there's no separate top-level `type`, so there's one source of truth for a field's kind, not two that could disagree.

## Pattern 1: the field registry

Every field type implements the same interface and registers itself:

```ts
export interface FieldDefinition<Config, Value> {
  type: FieldType
  createDefaultConfig: () => Config
  ConfigPanel: /* Builder's right-panel editor */
  FillField: /* how it renders in Fill Mode */
  validate: (value: Value, config: Config) => string | null
  // + a few optional hooks — see adding-a-field-type.md
}
```

Anything that needs to know about a field type — the Builder palette, the config panel, Fill Mode, PDF export — looks it up from this registry instead of hardcoding a list of field types:

```ts
const definition = getFieldDefinition(field.config.type)
definition.FillField   // renders this field, whatever type it is
```

That's what makes adding a new field type mostly additive — see `adding-a-field-type.md`.

Two Builder-only UI pieces (the condition editor's comparison-value input, and the canvas condition summary) do check a field's type directly — they're rendering something *about* a field, not the field's own behavior. That's a deliberate, narrow exception; a field's own validation/rendering/PDF output should always live in its registry file.

## Pattern 2: one pipeline for Submit and PDF

Filling out a form, submitting it, and exporting a PDF all go through the same three steps:

```
raw values  →  merge in calculated values  →  work out what's visible  →  keep only visible fields
```

Submit and PDF export both use this pipeline, so there's only one definition of "which fields count" in the app, not two that could quietly disagree.

## Rules worth knowing

| Rule | Why it's this way |
|---|---|
| Hidden fields are never required, and never appear in submitted data or the PDF | Structural — the code simply doesn't loop over hidden fields |
| Multiple conditions on one field are OR'd, not AND'd | "Show if Country = India" and "Show if Country = USA" on the same field both work as expected |
| If conditions conflict, hide beats show, and require beats not-required | Gives a clear, single answer when two rules disagree |
| A calculation includes hidden source fields | It reflects the real numbers entered, not just what's currently on screen |
| Select fields store the option's ID, not its label | Renaming an option later doesn't break old responses |
| Number fields store their value as text while typing | So `"3."` or `"-"` isn't lost mid-edit |
| The Builder only saves on Save | Edits live in a local draft until then |
| A submitted response keeps its own copy of the template | Editing or deleting fields later doesn't change how old responses look or export |

## Components

```
pages/
  TemplatesListPage   — the "/" home: template cards, New Template
  BuilderPage          — "/builder/new" and "/builder/:id": owns the draft reducer
  FillPage             — "/fill/:templateId": a fresh instance, submit, download
  ResponsesPage        — "/template/:id/responses": submitted instances for one template

components/builder/    — Builder-only pieces wired to the draft reducer
  Canvas               — the ordered field list; drag-to-reorder via dnd-kit
  FieldPalette          — left panel, one button per registered field type
  ConditionsEditor      — per-field condition rules; the one place that branches on a
                          target field's type directly (to pick the right compare-value input)
  OptionsEditor         — shared by Single/Multi Select's option list (add/remove/reorder)
  DefaultVisibilityToggle, PreviewModal

components/fill/
  FormRenderer          — the one place that resolves conditions + calculations, then
                          renders each visible field via its registry FillField; used by
                          both FillPage and BuilderPage's Preview

components/responses/
  ResponsePreviewModal  — read-only, reuses each field's formatForDisplay/
                          formatForDisplayList/renderForPdf hooks so it stays in
                          lockstep with the PDF export

components/common/     — presentational only, no field-type knowledge
  TextField, Checkbox, Button, Badge, AffixInput, CategoryLabel, BackLink
```

A page owns state (the draft reducer, or the loaded template/response) and hands data down; `FormRenderer` and the builder components never fetch or persist anything themselves — that stays in `pages/` and `context/`.

## Storage

Three localStorage keys, versioned — see the README for the exact schema.
