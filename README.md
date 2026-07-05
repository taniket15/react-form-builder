# Form Builder

A browser-based form builder (Google Forms-style) with a **Builder Mode** (design a form template) and a **Fill Mode** (fill out a template, submit, export a PDF). Pure frontend — React + TypeScript, all data in `localStorage`, no backend.

## Running locally

```bash
npm install
npm run dev       # start the dev server
npm run build     # typecheck (tsc -b) + production build
npm run test      # run the vitest unit suite
npm run lint      # eslint
```

Node 24+ (see `.nvmrc`) — uses `crypto.randomUUID()` and `structuredClone`, both standard in modern Node/browsers.

## Documentation

This README covers the schema and a scannable summary of the core architectural decisions. For everything else, see [`docs/README.md`](docs/README.md) for the full index — the short version:

| Doc | Covers |
|---|---|
| [`docs/decisions.md`](docs/decisions.md) | The extended "why" behind each architectural decision — pulled out of this README to keep it a scan |
| [`docs/architecture.md`](docs/architecture.md) | System shape — layers, the registry + engine pipeline, data flow, invariants |
| [`docs/adding-a-field-type.md`](docs/adding-a-field-type.md) | Step-by-step guide to adding a new field type |
| [`docs/extending.md`](docs/extending.md) | Recipes for other extensions — condition operator, calculation aggregation, schema migration |
| [`docs/ai-development.md`](docs/ai-development.md) | How this project is built with AI — skills, planning flow, prompt patterns |
| [`docs/ai-usage-log.md`](docs/ai-usage-log.md) | Chronological log of significant AI-assisted decisions |
| [`docs/testing-plan.md`](docs/testing-plan.md) | Manual QA test plan covering every requirement |
| [`docs/archive/`](docs/archive/) | Point-in-time planning/design docs — historical, not maintained |

## Project structure

```
src/
  types/        Domain types only — no React imports (FieldConfig union, FormField, Condition, FormTemplate, FormResponse)
  fields/       The field-type registry + one file per field type (the extensibility mechanism)
  engine/       Pure functions: conditions.ts, calculations.ts, visibility.ts — no React, fully unit-tested
  storage/      Typed localStorage read/write
  context/      TemplatesContext, ResponsesContext — thin collection CRUD only
  builder/      builderReducer — the Builder page's local draft (see "Builder state" below)
  components/
    builder/    Shared Builder UI: Canvas (dnd-kit), FieldPalette, ConditionsEditor, OptionsEditor, PreviewModal, DefaultVisibilityToggle
    fill/       FormRenderer — shared by Fill and Preview
    common/     Button, TextField, Checkbox — extracted after real 7–9x duplication across field ConfigPanels
  pages/        Route-level orchestration: TemplatesListPage, BuilderPage, FillPage, ResponsesPage
  pdf/          exportPdf.ts — browser-native PDF export (window.print, no library)
  utils/        formatDateTime, escapeHtml
```

## localStorage schema

Three keys, namespaced and versioned:

| Key | Contents |
|---|---|
| `formbuilder:v1:templates` | `FormTemplate[]` |
| `formbuilder:v1:responses` | `FormResponse[]` |
| `formbuilder:v1:schemaVersion` | current schema version number (currently `1`) |

```ts
interface FormTemplate {
  id: string
  title: string
  fields: FormField[]
  createdAt: string   // ISO
  updatedAt: string   // ISO, bumped on every Builder Save
}

interface FormField {
  id: string
  config: FieldConfig          // discriminated union, keyed by config.type
  conditions: Condition[]
  defaultVisible: boolean
}

interface FormResponse {
  id: string
  templateId: string
  templateSnapshot: FormTemplate   // full clone of the template AS OF submit time
  values: Record<string, unknown>  // only the fields that were visible at submit time
  submittedAt: string              // ISO
}
```

- **`templateSnapshot` clones the whole template**, not a hand-picked subset — a response must render (and re-export as PDF) exactly as it looked at submit time, permanently, even after the live template changes.
- **`values` stores only fields visible at submit time**, not everything typed — the spec requires hidden values to never appear in submitted data; filtering once at submit beats re-deriving later.
- **`schemaVersion` exists for a migration that doesn't exist yet** — nothing needs migrating so far, but the key is in place so a future breaking change has somewhere to detect old data.

Full reasoning for each: [`docs/decisions.md`](docs/decisions.md).

## Key architectural decisions

Short version below — full reasoning for each (including the correctness argument for the conditional-logic engine and the PDF anti-drift design) is in [`docs/decisions.md`](docs/decisions.md).

| Decision | Why |
|---|---|
| **Field-type registry** (`src/fields/registry.ts`) — one interface every field type implements | Adding a field type touches one new file plus two small edits, not a hardcoded list scattered across the app |
| **Conditional logic resolves in a single pass**, no fixpoint, no cycle guard (`src/engine/conditions.ts`) | Every condition reads a target field's *raw* value, never another field's *resolved* state — so there's no dependency graph to iterate, by construction |
| **Submit and PDF export share one pipeline**: `resolveFormValues` → `resolveFieldStates` → `getVisibleEntries` | One definition of "which fields count," so the two paths can't quietly disagree; PDF trusts a response's already-finalized keys instead of re-deriving them |
| **Calculations include hidden source fields' values** | A calculation reflects the data actually entered, not what's currently on screen — visibility elsewhere shouldn't make totals jump |
| **Builder edits live in a local `useReducer` draft** (`src/builder/builderReducer.ts`), not on `TemplatesContext` | Keeps "nothing persists until Save" true by construction, instead of leaking unsaved edits into the shared template list |
| **PDF export is browser-native** — `window.print()`, no library | Required by the spec; Fill Mode and the Responses list call the same export function, so there's one PDF code path |

## Other documented judgment calls

- **Select values are option `id`s, not labels** (Single/Multi Select) — consistent with how everything else references entities by id; labels can be renamed later without corrupting stored responses or conditions.
- **Number field values are stored as `string`, not `number`**, in Fill's local state — so intermediate typing states (`"-"`, `"3."`, `""`) aren't coerced away mid-entry. A single `parseNumber()` in `NumberField.tsx` is the one place raw text becomes a real number, reused by `validate`, `evaluateCondition`, and `computeCalculations`.
- **Multi Select validation:** an empty, non-required field is allowed (optional means "may be left blank"); a partial selection that doesn't meet `minSelections` is still an error, since a half-filled state can't be submitted.
- **File Upload matching** is by filename extension (case-insensitive), not MIME type — this is metadata-only storage with no real file content to sniff. The native `accept` attribute is a browser-level UX hint only; the extension check re-validates after the picker returns, since `accept` is trivially bypassable.
- **File Upload's PDF/preview rendering is a list, not a joined string** — the registry's `formatForDisplay` returns one plain string per field, which doesn't fit a field whose value is naturally a list of files. A separate `formatForDisplayList` hook was added instead of overloading `renderForPdf` (that hook already means "no value, render a heading" for Section Header, both in `exportPdf.ts` and `ResponsePreviewModal.tsx`), keeping scalar/list/no-value as three distinct field-rendering capabilities.
- **`required` lives once**, on every `FieldConfig` via `BaseConfig` (including Section Header/Calculation, always `false`, no UI toggle) — so generic engine code can read `field.config.required` without narrowing on field type first, and there's no second `defaultRequired` property that could disagree with it.

## What I'd improve with more time

- **Accessibility beyond the basics.** `htmlFor`/`id` pairing and `aria-invalid` are in place on every field's primary input, but a full pass with a screen reader (announcing condition-driven show/hide, live-region announcements for validation errors, focus management on Preview modal open/close) would go further.
- **Undo/redo in Builder.** The local draft reducer would make this straightforward to add (snapshot the draft on each action), but it wasn't in scope.
- **Deleting templates and responses.** The spec doesn't ask for it, so it wasn't built, but `TemplatesContext`/`ResponsesContext` are already shaped to add `deleteTemplate`/`deleteResponse` trivially.
- **Richer condition value pickers.** `ConditionsEditor` already branches its compare-value input by target field type (number/date/select-dropdown/range-pair/multi-checkbox), but a Single/Multi-line Text target still gets a plain text box with no autocomplete against existing values.
- **A real design system pass.** Styling is intentionally minimal Tailwind utility classes — functional and consistent, not pixel-polished (which the spec explicitly says isn't the bar).
- **Automated end-to-end tests.** The unit suite (24 tests) covers the engine layer thoroughly since that's the highest-risk correctness area, but there's no automated browser-driven test of the full Builder → Fill → Submit → PDF flow — that was verified manually throughout instead, following `docs/testing-plan.md`.
