# Form Builder — Frontend Take-Home

## Context

Greenfield build (repo currently contains only the assignment `.docx`). We're building a browser-based, Google-Forms-style **form builder** as a pure frontend app: React + TypeScript, all data in localStorage, no backend. It has a **Builder Mode** (design a form template) and a **Fill Mode** (create an instance from a template, fill it, validate, submit, export to PDF).

The assignment explicitly grades **judgment and correctness over completeness**. The three things it stresses:
1. **Extensibility** — "add an 11th field type without editing 6 files" → a field-type *registry*, not switch statements.
2. **Conditional-logic correctness** — chained conditions, hidden-but-required fields, real-time updates.
3. **PDF quality** — "a real export, not a debug dump", using **browser-native APIs only** (no PDF libs → `window.open` + print CSS).

**Stack (confirmed with user):** Vite + React + TS, Tailwind CSS, dnd-kit, React Context + `useReducer`.

### Spec interpretation to note
"Conditional Logic" is listed as field type #9 but is described as a feature of *any* field ("Any field can have one or more conditions"). So it is **not** a registry field type — it's a cross-cutting per-field capability. Actual registry field types = **9**: Single Line Text, Multi-line Text, Number, Date, Single Select, Multi Select, File Upload, Section Header, Calculation.

---

## Architecture

### 1. Field-type registry (the core extensibility mechanism)
`src/fields/registry.ts` defines a `FieldDefinition<TConfig, TValue>` interface; each field type lives in its **own file** and self-registers. Adding a new type = add one file + one register call. Nothing else changes.

```ts
interface FieldDefinition<C extends BaseConfig, V> {
  type: FieldType;
  label: string;               // palette label
  icon: ReactNode;             // palette icon
  createDefaultConfig(): C;    // when added to canvas
  ConfigPanel: FC<{ config: C; onChange(c: C): void; ctx: BuilderContext }>;
  FillField: FC<{ config: C; value: V; onChange(v: V): void; error?: string }>;
  getInitialValue(config: C): V;                     // Date pre-fill lives here
  validate(value: V, config: C): string | null;     // no-op (returns null) for Section Header / Calculation — see below
  // for use as a condition TARGET (omitted entirely for non-targetable types — Section Header, Calculation, File Upload):
  conditionOperators?: OperatorDef[];
  evaluateCondition?(op: Operator, targetValue: V, compareValue: unknown): boolean;
  // for PDF/export — presence of the hook IS the capability signal, no separate boolean flag needed:
  formatForDisplay?(value: V, config: C): string;    // every field with a real value (incl. Calculation): label/value row
  renderForPdf?(config: C): string;                  // Section Header only: structural heading markup, no value
}
```

No `isInput`/`hasValue` boolean flags — they'd be redundant with what's already expressible: "does this field type validate `required`" is answered by `config.required` always being `false` for Section Header/Calculation (§2, `BaseConfig`); "does it appear as a value row or a heading in export" is answered by which one of `formatForDisplay`/`renderForPdf` is defined (exactly one, per field type — a convention, not an enforced invariant, since only Section Header ever needs `renderForPdf`). Capability presence *is* the type, not a parallel set of booleans that could disagree with it.

Files: `src/fields/SingleLineText.tsx`, `MultiLineText.tsx`, `NumberField.tsx`, `DateField.tsx`, `SingleSelect.tsx`, `MultiSelect.tsx`, `FileUpload.tsx`, `SectionHeader.tsx`, `Calculation.tsx`. Barrel `src/fields/index.ts` imports all (triggers registration) and exports the registry map.

**One unavoidable type-erasure point:** any registry pattern — this generic `FieldDefinition<C,V>` shape or a keyed `{ [T in FieldType]: FieldDefinition<T> }` map — has exactly one place where `FormRenderer` looks up a definition by a `field.type` known only at runtime and hands its `field.config` to it; the specific `C`/`V` can't be statically connected to the specific `field` at that call site either way. This is where `unknown` + a narrowing boundary belongs (§2) rather than scattering `as never` through field files. Step 3's 3-field slice *is* the spike that proves this boundary stays clean before scaling to all 9 — if it needs more than one narrow, well-contained cast, that's a signal to revisit the registry shape then, not to guess now.

**Per-type config shape (from spec, for implementation reference):**
| Type | Config fields |
|---|---|
| Single Line Text | label, placeholder, required, minLength, maxLength, prefix, suffix |
| Multi-line Text | label, placeholder, required, minLength, maxLength, rows |
| Number | label, required, min, max, decimalPlaces (0–4), prefix, suffix. **Value representation (documented decision):** stored as `string` in Fill's local state (not `number`), so intermediate typing states like `"-"`, `"3."`, or `""` don't get coerced away mid-entry; a shared `parseNumber(raw): number \| null` in the Number field module is the single place raw text becomes a number, used by `validate`, `evaluateCondition`, `computeCalculations`'s source lookup, and `formatForDisplay`. **Decimal-place decision:** `decimalPlaces` validates the *entered* value's precision on submit (reject `12.123` when `decimalPlaces=2`, don't silently truncate what the user typed) — it's a separate concern from Calculation's `decimalPlaces`, which rounds a *computed* result and is fine to apply silently since nothing was "typed." |
| Date | label, required, prefillToday, minDate, maxDate |
| Single Select | label, required, options[], **displayType: 'radio' \| 'dropdown' \| 'tiles'** (all three share one `FillField` renderer that branches on `displayType`, so behavior — selection, required validation — stays identical) |
| Multi Select | label, required, options[], minSelections, maxSelections |
| File Upload | label, required, allowedTypes (comma-separated string), maxFiles. **Matching decision:** `allowedTypes` matches by filename extension (case-insensitive, e.g. `.pdf`), not MIME type — this is metadata-only storage (no file content available to sniff), so extension is the only signal we actually have. The native `<input accept="...">` attribute is set from the same list as a browser-level UX hint only; it is not authoritative — the real check re-validates the extension after the browser's file picker returns, since `accept` is trivially bypassable. |
| Section Header | label, size: 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' — no value, no validation (`required` on its config is always `false`, no UI toggle), excluded as a condition target and as a Calculation source, rendered via `renderForPdf` as a heading (the only field type without `formatForDisplay`) |
| Calculation | label, sourceFieldIds (Number fields only), aggregation: 'sum' \| 'average' \| 'min' \| 'max', decimalPlaces — always read-only, `required` on its config is always `false` (never validated), but its computed result is a real value and appears via `formatForDisplay` in the submit payload and PDF like any input field, just never editable or condition-targetable |

**Condition target operators (only Single Line/Multi-line Text, Number, Single Select, Multi Select, Date are valid condition targets — Section Header, Calculation, **and File Upload** are excluded from the target-field picker, since none has a value the spec defines comparison operators for):**
| Target field type | Operators |
|---|---|
| Single Line Text, Multi-line Text | equals, does not equal, contains |
| Number | equals, is greater than, is less than, is within range |
| Single Select | equals, does not equal |
| Multi Select | contains any of, contains all of, contains none of |
| Date | equals, is before, is after |

`is within range`'s compare value is `{ min: number; max: number }` (not a single `value`) — the `Condition` type's `value: unknown` accommodates this per-operator shape, and `ConditionsEditor` renders two number inputs instead of one when this operator is selected.

### 2. Types — `src/types/`
- Discriminated union `FieldConfig` keyed by `type` (each field's config shape).
- `FormField` = `{ id, type, config, conditions: Condition[], defaultVisible: boolean }`.
- **Required is single-sourced:** `BaseConfig` (which every `FieldConfig` variant extends) carries one `required: boolean` (the "Required toggle" from the spec). This *is* the default-required state fed into the conditions engine — there is no separate `defaultRequired`. Conditions only ever *override* it via `require`/`unrequire` effects; they never duplicate it. Section Header and Calculation configs **still include `required`** (always `false`, no toggle rendered in their `ConfigPanel`) rather than omitting the field entirely — this keeps it a total property across the whole `FieldConfig` union, so `resolveFieldState` (§3) can read `field.config.required` uniformly without narrowing on `field.type` first; omitting it for two variants would force either an unsafe cast or a type-narrowing branch in otherwise-generic engine code, for a property that's `false` anyway.
- `Condition` = `{ id, targetFieldId, operator, value, effect }`; `effect ∈ {show, hide, require, unrequire}`.
- `FormTemplate` = `{ id, title, fields, createdAt, updatedAt }`.
- `FormInstance` = `{ id, templateId, templateSnapshot: FormTemplate, values: Record<fieldId, unknown>, submittedAt }`. **`templateSnapshot` is the entire `FormTemplate`** (`structuredClone(template)` at submit time), not a hand-picked subset like `{title, fields}`. Reasoning: the template can keep changing after a form is submitted (fields added/removed/reworded, conditions edited); Re-download PDF and any future re-render of an instance must reflect *the exact template that produced that submission*, not whatever the template looks like today. A hand-picked snapshot type is a second model of "what a template is" that has to be manually kept in sync every time `FormTemplate` gains a field — cloning the whole thing removes that maintenance burden and gives a stronger invariant for free, and storage size is a non-concern at this scale.
- Value types per field (e.g. `FileMeta[]` = `{name,size,type}` for uploads). **No `any`** — use `unknown` + narrowing at registry boundaries.

### 3. Conditional-logic engine — `src/engine/conditions.ts`
Pure, **single-pass, per-field** `resolveFieldStates(fields, rawValues): Record<fieldId, {visible, required}>`. No iteration, no fixpoint, no cycle guard — see below for why that's not just simpler but *correct*, not an approximation.

```ts
function resolveFieldState(field: FormField, rawValues: FormValues): FieldState {
  const matchedEffects = field.conditions
    .filter(c => evaluateCondition(c, rawValues[c.targetFieldId]))
    .map(c => c.effect);

  const visible = matchedEffects.includes('hide') ? false
    : matchedEffects.includes('show') ? true
    : field.defaultVisible;

  const required = matchedEffects.includes('require') ? true
    : matchedEffects.includes('unrequire') ? false
    : field.config.required; // the toggle *is* the default-required state, see §2

  return { visible, required };
}
```

- **Collect-then-resolve, not sequential apply:** all matched effects for a field are gathered first, then each state dimension (visible, required) is resolved independently by explicit precedence — **hide > show > default**, **require > unrequire > default**. No `applyEffect(state, effect)` loop with implicit order-of-conditions semantics; the result can't depend on the order conditions happen to be stored in.
- **Multiple-conditions rule (documented decision): independent rules, not AND.** Each condition on a field is evaluated on its own against the raw values; any condition whose test passes contributes its effect to `matchedEffects` (this is what the code above already does via `.filter(...).map(c => c.effect)`). This gives OR-like activation *within* the same effect — e.g. `Country equals India → show` **or** `Country equals USA → show` correctly shows the field if either matches. An earlier draft of this plan described the same code as "AND, since each condition maps to one effect" — that framing was actually wrong and inconsistent with the code: AND-ing conditions that share an effect would mean *both* the India and USA rules would have to hold simultaneously for the field to show, which is never true for a single-valued field and makes that whole class of "show for any of these values" configuration impossible to express. Independent rules avoid that trap. Only when two *different* effects both match on the same dimension (e.g. one condition says `hide`, another says `show`) does precedence — **hide > show**, **require > unrequire** — decide the outcome. Documented in README.
- **Every condition reads only `rawValues[condition.targetFieldId]` — never another field's resolved `{visible, required}`.** This is *why no fixpoint is needed*: a field's state depends purely on raw stored values, never on any other field's derived state, so there is no dependency graph to converge — `resolveFieldStates` is just `fields.map(f => resolveFieldState(f, rawValues))` in one pass. A "chain" like *A hides B, C has a condition targeting B* still resolves correctly in that single pass, because C reads B's raw stored value directly, regardless of what B's own visibility resolves to. The earlier draft of this plan iterated to a fixpoint on the mistaken premise that chains needed it; they don't, because of this rule.
- **Redundant conditions are allowed, not special-cased:** e.g. `defaultVisible: true` plus a `show` condition is a no-op condition — the UI doesn't need to detect or block this; it's harmless and the builder shouldn't try to be clever about it.
- **Hidden-field output handling (documented decision):** when a field's *resolved* visibility is hidden: (1) it is never validated as required, regardless of its resolved required state, and (2) it's excluded from `getVisibleEntries` output (§5) — so from the submit payload and PDF export. Its *stored* value is left intact in local form state (not wiped), so toggling visibility back on doesn't lose what the user typed, and so other fields' conditions can still reference it per the point above.
- Calculation fields cannot be condition targets (§1 — no `conditionOperators`), so calculation results never feed back into `resolveFieldStates` either. Conditions and calculations are two independent pure functions over the same `rawValues`, not a pipeline with a cycle between them.

### 4. Calculation engine — `src/engine/calculations.ts`
Pure `computeCalculations(fields, rawValues): Record<fieldId, number>` — sum/avg/min/max over source Number fields' *raw* stored values, rounded to configured decimals; recomputed on every value change (real-time). Guards: source must be Number fields; cannot source another Calculation.
- **Hidden-source decision (documented):** a source Number field's *stored* value is used in the calculation even if that field is currently hidden by conditions — i.e. calculations ignore visibility and always reflect the true entered values. Rationale: the calculation is a derived quantity, not a user-facing "what's currently shown" summary, and swapping which numbers count based on visibility would make totals jump unpredictably as unrelated fields toggle. An empty/never-filled source field counts as `0` for Sum/Min/Max and is excluded from the denominator for Average.
- `resolveFormValues(fields, rawValues): FormValues` lives alongside `computeCalculations` in this file: `{ ...rawValues, ...computeCalculations(fields, rawValues) }`. This is the one place calculation results get merged into a values map keyed by field id — Calculation values are derived and never actually typed into `rawValues`, so anything that needs to *display* a calculation's value (rather than compute it) reads from `resolveFormValues`'s output, not `rawValues` directly.

### 5. The shared pipeline — `resolveFormValues` → `resolveFieldStates` → `getVisibleEntries`
Three small, independently-testable pure functions, not one overloaded helper:

```
rawValues (Fill's local state)
   → resolveFormValues(fields, rawValues)     // merge in calculation results  (§4)
   → resolveFieldStates(fields, rawValues)    // visibility/required, from RAW values, independently (§3)
   → getVisibleEntries(fields, resolvedValues, fieldStates)   // dumb filter + map, no logic of its own
```

`getVisibleEntries`, in `src/engine/visibility.ts`, is intentionally trivial:
```ts
function getVisibleEntries(fields, resolvedValues, fieldStates) {
  return fields
    .filter(f => fieldStates[f.id].visible)
    .map(f => ({ field: f, value: resolvedValues[f.id] }));
}
```
`FillForm.handleSubmit` (building `FormInstance.values`) and `exportPdf` (building the rendered rows) both run the same three-function pipeline over their respective `rawValues` — there's no second, PDF-specific notion of "which fields count" or "what a calculation's value is," so the two can't silently drift apart. Note `resolveFieldStates` takes `rawValues`, not the calculation-merged `resolvedValues` — deliberately, since conditions never target Calculation fields (previous point), so the merge is irrelevant to visibility and keeping it out avoids implying a dependency that doesn't exist.

### 6. State — React Context + `useReducer`
- **`src/context/TemplatesContext.tsx` stays thin: a collection, not a field-editing API.** Actions are just `createTemplate(template)`, `updateTemplate(template)`, `deleteTemplate(id)` — each one persists the *entire collection* to localStorage. It has no per-field actions (no `addField`, `updateFieldConfig`, `addCondition`, etc.).
- **`src/builder/builderReducer.ts` — the Builder page's local draft**, seeded once on mount by cloning the template being edited (`structuredClone`) from `TemplatesContext`, or a blank template for a new one. Every Builder interaction — add/remove/reorder a field, edit its config, add/remove a condition, change the title — dispatches into this local reducer and only ever touches the draft in memory. **Save** is the one moment the draft is committed: `updateTemplate(draft)`. This is a deliberate fix over an earlier draft of this plan, which put field-editing actions directly on `TemplatesContext`: if every keystroke in the config panel mutated the shared context, either every action would silently persist (making the spec's explicit **Save** button meaningless) or the shared in-memory `templates` array would show unsaved edits everywhere it's read — e.g. the `TemplatesList` card's field count would appear to update live from an in-progress, unsaved Builder session, then revert on refresh once storage reloads the last-saved version. A local draft makes "unsaved changes exist only in Builder, until Save" true by construction rather than by convention.
- **`/builder/new` doesn't create a `FormTemplate` in `TemplatesContext` at all.** The Builder page seeds its local draft with a fresh blank template (a `crypto.randomUUID()`'d id, empty fields) and only calls `createTemplate(draft)` on the *first* Save, then navigates to `/builder/:newId`. This avoids a "New Template" click alone producing an "Untitled Form" ghost entry in `TemplatesList` and localStorage before the user has done anything.
- `src/context/InstancesContext.tsx` — instances CRUD (`createInstance`, list by template).
- Fill-mode form *values* are local component state (`useReducer` inside `FillForm`), not global — resolved states + calculations derive from it each render via the §5 pipeline.

### 7. Storage — `src/storage/localStorage.ts`
Keys: `formbuilder:v1:templates`, `formbuilder:v1:instances`, `formbuilder:v1:schemaVersion`. Typed load/save with try/catch + safe fallback. Version key enables future migration. Works after full refresh (contexts hydrate from storage on mount).

### 8. PDF export — `src/pdf/exportPdf.ts` (browser-native only)
Takes a `FormInstance` and renders **its `templateSnapshot`**, not the live `FormTemplate` from `TemplatesContext` — this guarantees the export always matches exactly what was submitted, even if the template has since been edited (§2). Runs the shared pipeline (§5) over `instance.values` and `templateSnapshot.fields` to get `getVisibleEntries`'s output, then `window.open()`s a blank document, writes a self-contained styled HTML doc (form title, submission timestamp, each visible entry's label + `formatForDisplay(value)` in form order), and calls `window.print()`. File-upload fields render filenames + a "(file not embedded)" note. A visible **Section Header** is the one exception: it renders as a structural heading (its label, sized per its `size` config) via `renderForPdf`, since it's the only field type that defines that hook instead of `formatForDisplay`. Everything else — including **Calculation**, which is never editable but still has a real computed value — renders as a normal label/value row via `formatForDisplay(computedValue, config)`, using the calculation-merged value `getVisibleEntries` already provided. Reused for both first export and re-download from the instances list (both read the same `instance.templateSnapshot`, so re-download is byte-for-byte reproducible regardless of template edits made afterward). Clean typographic layout via inline `<style>` + `@media print`.

### 9. Routing & pages — React Router (`src/pages/`)
- `TemplatesList` (`/`) — cards: title, field count, instance count, last modified. Clicking the card body opens `Builder` (edit); each card also has its own "New Response" button (→ creates instance, opens `Fill`) and a "View Responses" link (→ `Instances`), so all three destinations are reachable straight from the card without ambiguity about what a plain click does. "New Template" button in the header navigates to `Builder` at **`/builder/new`** (§6 — no template is persisted until first Save).
- `Builder` (`/builder/:templateId | new`) — header bar with an editable **title input** (bound to the local draft's title, spec requires this to show on cards/PDF) plus a link to that template's `Instances` (only shown once the template has been saved at least once — `/builder/new` hasn't got an id to link to yet). 3 panels below: `FieldPalette` (left, click/drag to add), `Canvas` (center, dnd-kit sortable + drop target), `ConfigPanel` (right, selected field's `ConfigPanel` + shared Conditions/Required-toggle/Default-visibility editor) — all three operate on the local `builderReducer` draft (§6), not `TemplatesContext` directly. Save commits the draft via `TemplatesContext.updateTemplate` (or `createTemplate` + redirect to `/builder/:newId` the first time). Preview (modal → Fill). **Preview renders the same `FormRenderer` as real Fill mode over the *draft*, but its Submit just closes the modal (never calls `InstancesContext`'s create action) and its Download PDF is disabled/hidden** — there's no real `FormInstance` or `submittedAt` to export in preview, so testing a form as a builder can't pollute the real Instances list or produce a PDF with a fabricated timestamp.
- `Fill` (`/fill/:templateId`) — `FormRenderer` maps fields → `FillField` wrapped by visibility/required from the engine; real-time conditions + calculations via the §5 pipeline; validate on submit against `getVisibleEntries` output. Submit builds `FormInstance` with `templateSnapshot: structuredClone(template)` (redirects to that template's `Instances` list afterward) + Download PDF.
- `Instances` (`/template/:id/instances`) — list submissions with timestamp + Re-download PDF; reachable from the template card and from the Builder header.

### 10. Builder config shared pieces — `src/components/builder/`
`ConditionsEditor` (add/remove conditions; target-field picker excludes the field itself and non-targetable types (Section Header, Calculation, File Upload — matching §1's `conditionOperators`-omitted set); operator dropdown driven by target field's `conditionOperators`), `DefaultVisibilityToggle` (sets `defaultVisible`; the required default lives on the field's own `required` toggle per §2, not a separate control), `OptionsEditor` (add/remove/reorder options — reused by Single/Multi Select). dnd-kit `SortableList` reused for canvas fields and select options.

---

## Build order
1. Scaffold Vite+TS+Tailwind; deps (`react-router-dom`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`); dev deps `vitest` (pure-function tests, step 5) and `eslint` + `typescript-eslint` (catches stray `any`/unused vars early). Enable `strict`, `noUncheckedIndexedAccess`, and `noImplicitReturns` in `tsconfig.json` from the start — `noUncheckedIndexedAccess` matters for the `Record<fieldId, ...>` lookups all through the conditions engine. Use `crypto.randomUUID()` for all IDs (template/field/condition/instance) — no extra dep needed.
2. Types + storage + thin `TemplatesContext`/`InstancesContext` (empty-app shell renders, persists).
3. Registry interface + 3 simple fields (SingleLineText, Number, SectionHeader) end-to-end through Builder→Fill, including `builderReducer`'s local draft (§6), `/builder/new`, a title input on Builder, and a Save that survives a full page refresh — proves persistence and the draft/context split early.
4. Remaining fields (Date, both Selects w/ all 3 Single Select display types, Multiline, FileUpload).
5. Conditions engine (single-pass, declarative, independent rules — §3) + ConditionsEditor + default-visibility; wire real-time in Fill. Write 3–4 pure unit tests for `resolveFieldStates` alongside it (hidden-required-not-validated, two `show` conditions on different target values both able to activate the same field — OR-like, not AND, per §3, a condition still resolving correctly against an already-hidden target's stored value, self-reference excluded from picker) — this function is the highest bug-surface area in the app and cheapest to pin down as pure-function tests before wiring UI on top.
6. Calculation field + engine (incl. hidden-source-still-counts behavior, and `resolveFormValues` merging calculation results — §4). Add 2 unit tests for `computeCalculations` alongside it (sum counts a hidden source's stored value; average excludes an empty/unfilled source from the denominator rather than treating it as 0).
7. `getVisibleEntries` (§5) + validation on submit; instance save with `templateSnapshot`; Instances list + navigation links from card/Builder header.
8. PDF export.
9. Polish (Tailwind styling, empty states, preview modal).
10. README (localStorage schema + reasoning, architecture/trade-offs, independent-rules-not-AND decision, hidden-field decision, calculation-hidden-source decision, "what I'd improve") + AI usage log.

---

## Implementation checklist

### Step 1 — Scaffold
- [ ] `npm create vite@latest` (react-ts template); Tailwind installed and configured
- [ ] Install `react-router-dom`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [ ] Install dev deps: `vitest`, `eslint`, `typescript-eslint`
- [ ] `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`
- [ ] `package.json` scripts include `"test": "vitest run"` (and `"test:watch": "vitest"` if useful)
- [ ] Confirm `npm run dev`, `npm run build`, and `npm run test` all work on the empty scaffold

### Step 2 — Types, storage, contexts
- [ ] `src/types/`: `FieldConfig` (discriminated union), `FormField`, `Condition`, `FormTemplate`, `FormInstance`
- [ ] `src/storage/localStorage.ts`: typed load/save + try/catch fallback, `formbuilder:v1:*` keys
- [ ] `src/context/TemplatesContext.tsx` + `useTemplates()` hook (throws outside provider) — thin collection CRUD only: `createTemplate`, `updateTemplate`, `deleteTemplate` (§6, no field-editing actions)
- [ ] `src/context/InstancesContext.tsx` + `useInstances()` hook
- [ ] React Router wired with placeholder pages for `/`, `/builder/new`, `/builder/:id`, `/fill/:id` (real content lands in Step 3 — this just means Step 3 doesn't also have to introduce routing)
- [ ] App shell renders with empty state; contexts hydrate from storage on mount

### Step 3 — Registry + first 3 fields, end-to-end
- [ ] `src/fields/registry.ts`: `FieldDefinition` interface + register/getDefinition functions
- [ ] `SingleLineText.tsx`, `NumberField.tsx`, `SectionHeader.tsx` implemented and registered
- [ ] `TemplatesList` page: New Template button (→ `/builder/new`), card grid (title/field count/instance count/last modified)
- [ ] `src/builder/builderReducer.ts`: local draft reducer, seeded from `structuredClone(template)` on `/builder/:id` or a blank template on `/builder/new` (§6)
- [ ] `Builder` page: title input, field palette, canvas (add/select field), config panel — all wired to `builderReducer`'s draft, not `TemplatesContext` directly
- [ ] `Fill` page: renders registered fields, holds local values state
- [ ] Save calls `createTemplate` (first save on `/builder/new`, then redirect to `/builder/:newId`) or `updateTemplate` (subsequent saves) with the draft; **full page refresh retains the template and its config**
- [ ] Card body click opens `Builder` for that template (not just implied by "click template" in §9)
- [ ] Canvas field reorder via dnd-kit works with just these 3 field types (don't defer to Step 9 — cheapest to prove now, before more fields make the canvas noisier to test)
- [ ] `src/fields/index.ts` barrel imports all field modules so registration runs on app load
- [ ] Manually confirm the draft/context split: edit a field's config in Builder, navigate away *without* saving, come back — the edit is gone (proves TemplatesContext never saw the unsaved draft)

### Step 4 — Remaining field types (build in this order, matching Commit Map Phase D)
- [ ] `MultiLineText.tsx` (rows, min/max length)
- [ ] `DateField.tsx` (prefill-today, min/max date)
- [ ] `OptionsEditor` shared component (add/remove/reorder options) — built before the two Select types since both depend on it
- [ ] `SingleSelect.tsx` — radio, dropdown, and tiles all implemented behind one `displayType`-branching `FillField`
- [ ] `MultiSelect.tsx` (min/max selections)
- [ ] `FileUpload.tsx` (metadata-only: filename/size/type; allowed types; max files)
- [ ] Each new field module added to the `fields/index.ts` barrel as it's built

### Step 5 — Conditional logic
- [ ] `src/engine/conditions.ts`: `resolveFieldState`/`resolveFieldStates(fields, rawValues)` — single-pass, per-field, no iteration (§3)
- [ ] Collect-matched-effects-then-resolve-per-dimension implemented exactly as sketched in §3 (no sequential `applyEffect` loop, no cycle guard — there's no cycle to guard against)
- [ ] Independent rules, not AND: two conditions with the same effect both contribute to `matchedEffects` via OR-like membership, not a combined boolean AND (§3)
- [ ] `ConditionsEditor` component: target-field picker (excludes self, Section Header, Calculation, File Upload), operator dropdown from `conditionOperators`, range operator renders `{min,max}` inputs
- [ ] Wired into `Fill` for real-time show/hide and required toggling
- [ ] Unit tests (`resolveFieldStates`): hidden-required not validated; two `show` conditions on different values both able to activate the field (proves independent-rules, not AND); a condition still resolves correctly against an already-hidden target's raw stored value; self-reference excluded from picker

### Step 6 — Calculation field
- [ ] `Calculation.tsx`: source-field picker (Number fields only, excludes other Calculations), aggregation select, decimal places
- [ ] `src/engine/calculations.ts`: `computeCalculations(fields, rawValues)` — sum/average/min/max
- [ ] `resolveFormValues(fields, rawValues)` in the same file, merging calculation results into a values map (§4)
- [ ] Read-only in Fill; updates in real-time as sources change
- [ ] Unit tests: sum counts a hidden source's stored value; average excludes an empty source from the denominator
- [ ] Calculation's config has `required: false` (never validated, no toggle in its `ConfigPanel`) and defines `formatForDisplay` (not `renderForPdf`) in its registry entry — a visible Calculation's computed result appears as a label/value row in submit payload + PDF like any input field (see §1, §8)

### Step 7 — Submit + Instances
- [ ] `src/engine/visibility.ts`: `getVisibleEntries(fields, resolvedValues, fieldStates)` — dumb filter + map, no logic of its own (§5)
- [ ] Submit runs the full pipeline: `resolveFormValues` → `resolveFieldStates` → `getVisibleEntries`, then validates each visible entry's `validate()` + hidden-required-never-blocks rule
- [ ] `InstancesContext` create action; `FormInstance` saved with `templateSnapshot: structuredClone(template)`, `values` = `getVisibleEntries` output, and a timestamp
- [ ] `Instances` page: list per template, timestamp, Re-download PDF button
- [ ] Navigation wired: card → New Response → Fill → Submit → Instances; card → View Responses; Builder header → Instances
- [ ] "New Response" opens `Fill` with fresh/empty local state — no `FormInstance` is created until Submit fires
- [ ] Template `updatedAt` is bumped on every Builder Save

### Step 8 — PDF export
- [ ] `src/pdf/exportPdf.ts`: `window.open` + styled HTML + `window.print()`
- [ ] Renders `instance.templateSnapshot` + `instance.values`, not the live template from `TemplatesContext` (§8 architecture) — re-download stays correct even if the template was edited afterward
- [ ] Runs the same §5 pipeline as submit over the snapshot's fields — hidden fields never appear
- [ ] Input fields via `formatForDisplay`; Section Header via `renderForPdf` (heading, not label/value row)
- [ ] File Upload shows filename/size + "(file not embedded)" note
- [ ] Visible Calculation fields render their computed value as a label/value row (via `formatForDisplay`, not `renderForPdf` — see Step 6)
- [ ] Form title + submission timestamp + fields in form order
- [ ] Re-download from Instances list produces an identical PDF (same `templateSnapshot`, same pipeline)
- [ ] `@media print` layout smoke-tested: reasonable margins, no awkward page breaks through a field's label/value pair

### Step 9 — Polish
- [ ] Preview modal in Builder (reuses `FormRenderer` over the draft; Submit just closes modal — no `InstancesContext` write; Download PDF button hidden/disabled in preview since there's no real `submittedAt` to export — §9)
- [ ] Empty states: no templates, no field selected, no responses yet
- [ ] Common primitives (`Button`, `Input`, `Label`, `Card`) extracted if duplicated 3+ times
- [ ] Basic accessibility: `<label htmlFor>`, `aria-invalid` on errored inputs, keyboard-reachable tiles/radios
- [ ] Drag-and-drop reorder re-verified with the full field set (canvas reorder itself was already proven in Step 3; select-options reorder via `OptionsEditor` is new here)

### Step 10 — Docs + final checks
- [ ] README: run instructions, localStorage schema + reasoning (incl. why `FormInstance.templateSnapshot` clones the whole template), architecture/trade-offs (incl. the `resolveFormValues → resolveFieldStates → getVisibleEntries` pipeline as the shared submit/PDF anti-drift mechanism, why conditions need no fixpoint, and the Builder-draft/thin-context split — §6), independent-rules-not-AND + precedence decision, hidden-field decision, calculation-hidden-source decision, "what I'd improve"
- [ ] `docs/ai-usage-log.md` (started during planning, not written retroactively — kept as its own file, separate from this plan): review and finalize the implementation-phase entries appended alongside each significant decision made while coding
- [ ] `npm run build` and `tsc --noEmit` clean, zero `any`
- [ ] `npm run test` (vitest) passing
- [ ] Full manual pass: all 9 field types in Builder→Fill→Submit→PDF; conditional stored-vs-visibility case; calculation hidden-source case; full refresh retains everything

---

## Commit map

The 10 build-order steps above are **milestones**, not commit boundaries — several (3, 4, 7) bundle multiple reviewable concerns. Commit at the grain below instead: one field type, one engine function, one page shell, one wire-up. Target ~30 commits total, diffs mostly under ~250 lines, app runnable (`npm run dev`) after every commit.

**Message shape:** `<type>(<scope>): <imperative summary>` — types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`. Engine commits ship with their tests, not a separate "add tests" commit later.

| Phase | Step | Commits |
|---|---|---|
| A | 1 | `chore: scaffold Vite React TS app with Tailwind` · `chore: add router, dnd-kit, vitest, and strict tsconfig` |
| B | 2 | `feat(types): add FormTemplate, FormField, and FieldConfig unions` · `feat(storage): add versioned localStorage helpers` · `feat(context): add thin TemplatesContext (create/update/delete only, no field-editing actions)` · `feat(context): add InstancesContext and app providers shell` |
| C | 3 | `feat(fields): add FieldDefinition registry and barrel registration` · one commit each for SingleLineText / NumberField / SectionHeader · `feat(pages): add TemplatesList with New Template routing to /builder/new` · `feat(builder): add builderReducer local draft, seeded from template or blank` · `feat(pages): add Builder shell with palette, canvas, config panel wired to the draft (no dnd yet)` · `feat(pages): add Fill page with FormRenderer` · `feat(builder): add dnd-kit reorder on canvas and Save (create-or-update the draft into TemplatesContext)` (this is the "Step 3 done" milestone) |
| D | 4 | One commit per remaining field (MultiLineText, DateField, SingleSelect w/ all 3 display types, MultiSelect, FileUpload) · `feat(builder): add OptionsEditor for select fields` before Single/Multi Select land · options-reorder-via-dnd folded into the OptionsEditor commit unless it grows large enough to split |
| E | 5 | `feat(engine): add resolveFieldStates as a single-pass, independent-rules resolver with unit tests` (engine + tests together — small enough for one commit; no fixpoint/cycle-guard code to write; independent rules, not AND, so competing `show` conditions OR together) · `feat(builder): add ConditionsEditor and default visibility controls` · `feat(fill): wire conditional visibility and required state into FormRenderer` |
| F | 6 | `feat(engine): add computeCalculations and resolveFormValues with unit tests` · `feat(fields): add Calculation field type with read-only Fill UI` |
| G | 7 | `feat(engine): add getVisibleEntries for submit and export` (ships here, ahead of PDF, since Phase H depends on it) · `feat(instances): add templateSnapshot on FormInstance and submit validation` · `feat(pages): add Instances list with timestamps` · `feat(routing): wire New Response, View Responses, post-submit navigation, and updatedAt-on-save` |
| H | 8 | `feat(pdf): add browser-native export via print HTML, rendering instance.templateSnapshot` (uses `getVisibleEntries` + `formatForDisplay`/`renderForPdf` from the start) · `feat(instances): add Re-download PDF from saved submissions` |
| I | 9 | `feat(builder): add Preview modal over the draft, with instance persistence and PDF download both disabled` · `feat(ui): add empty states for templates, builder, and instances` · `feat(ui): extract common Button/Input/Label/Card primitives` (only if duplicated 3+ times) · `fix(a11y): add labels, aria-invalid, and keyboard support for selects` |
| J | 10 | `docs: add README with architecture and design decisions` · `docs: add AI usage log` (kept separate so it's easy to skip in review) |

**Before each push:** diff is a single `feat`/`fix`/`chore` concern, no drive-by refactors riding along, `npm run build` passes, `npm run test` passes if an engine file changed, one UI path smoke-tested if a page/component changed.

---

## Verification
- `npm run dev`; `npm run build` + `tsc --noEmit` clean (no `any`).
- **Extensibility check:** confirm adding a hypothetical 10th field touches only a new file + `fields/index.ts`.
- **Manual flows (optionally via Playwright MCP):**
  - Create template with all 9 field types; save; refresh page → template + config persist.
  - Fill mode: required validation blocks submit; Single Select renders identically as radio/dropdown/tiles; Multi Select min/max enforced.
  - **Conditional:** field A shows/hides field B in real-time; a hidden required field does NOT block submit and is absent from submitted data.
  - **Conditional (stored-vs-output split, single-pass correctness):** fill in field B, then have field A hide B — confirm a condition on field C that targets B still evaluates correctly against B's raw stored value even while B is hidden, with no iteration needed to get the right answer (§3).
  - **Conditional (independent rules, not AND):** a field with two `show` conditions on the same target field but different values (e.g. `Country equals India` OR `Country equals USA`) becomes visible when *either* value is entered, not only when both conditions' tests would somehow hold simultaneously.
  - **Calculation:** value updates live as source Number fields change; read-only; confirm the total does NOT change when one of its source Number fields is hidden by an unrelated condition (hidden sources still count per §4).
  - Submit → appears in Instances list with timestamp.
  - **PDF:** export shows title, timestamp, visible labels+values in order, hidden fields absent, upload shows filename note — looks like a real document.
  - **Re-download after template edit:** submit an instance, then edit the template (rename a field, add a new one), then Re-download that instance's PDF from Instances — it must still show the *original* field labels/values from `templateSnapshot`, not the edited template.
  - **Builder draft isolation:** open a saved template in Builder, edit a field's config, navigate away without clicking Save, reopen the template — the edit is gone (proves `TemplatesContext` never saw the unsaved draft, per §6).
  - **`/builder/new` doesn't ghost-create:** click "New Template," navigate away without saving — `TemplatesList` shows no new "Untitled Form" entry and localStorage has no new template record.
- Date "pre-fill today" populates on a fresh instance; min/max date bounds enforced.
