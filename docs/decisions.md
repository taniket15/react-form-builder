# Design Rationale

The extended "why" behind the decisions summarized in the main [`README.md`](../README.md) — pulled out on its own so the README stays a scan, not a defense brief. Nothing here is required to run or extend the app; see [`architecture.md`](architecture.md) for the shape and [`extending.md`](extending.md) for how to change things.

## Storage shape

**Why `templateSnapshot` clones the whole `FormTemplate`, not a hand-picked subset** (e.g. `{title, fields}`): a template keeps changing after people submit responses against it — fields get renamed, added, removed. A response needs to render (and re-export as PDF) exactly as it looked when it was submitted, indefinitely, even after the live template has moved on. A hand-picked snapshot type is a second model of "what a template is" that has to be manually kept in sync every time `FormTemplate` gains a property; cloning the whole thing removes that maintenance burden and gives a stronger invariant for free ("a response contains the exact template that produced it"). Storage size is a non-concern at this scale.

**Why `values` only contains visible-at-submit-time fields, not everything the user typed:** the spec requires "a hidden field's value must not appear in the submitted data." Rather than storing everything and filtering at render time, the filtering happens once, at submit time — `response.values`'s keys *are* the finalized visibility decision. PDF export (and any future re-render) trusts those keys directly rather than re-deriving them (see "Conditional logic" below for why re-deriving would actually be wrong in an edge case).

**`schemaVersion`** exists so a future breaking change to the shape of `FormTemplate`/`FormResponse` has somewhere to detect "this is old data" and run a migration — no migration exists yet since there's nothing to migrate from, but the key is in place so adding one later doesn't require guessing whether existing users have unversioned data.

## 1. Field-type registry — the extensibility mechanism

`src/fields/registry.ts` defines one interface, `FieldDefinition<C, V>`, that every field type implements: `createDefaultConfig`, `ConfigPanel`, `FillField`, `getInitialValue`, `validate`, and three optional hooks — `conditionOperators`/`evaluateCondition` (only for types that can be a condition target), `formatForDisplay` (label/value row in submit + PDF), `renderForPdf` (Section Header only — a structural heading, not a row). Each of the 9 field files self-registers with `registerField(...)` at module load; `src/fields/index.ts` just imports all 9 files for that side effect.

**Adding a 10th field type touches one new file** plus two small edits — one import line in the barrel, and adding the type to the `FieldType`/`FieldConfig` unions in `src/types/field.ts` (unavoidable in a closed discriminated union). See `docs/adding-a-field-type.md` for the step-by-step guide, and `docs/architecture.md` for the couple of narrow, deliberate exceptions to "no field type outside the registry."

There's exactly one deliberate type-erasure point in the whole app: the registry stores definitions as `FieldDefinition<FieldConfig, unknown>` internally (one `as unknown as` cast, inside `registerField`), so the map can hold 9 different concrete `(config, value)` type pairs. Every field module itself stays fully typed against its own concrete types — the erasure is confined to the registry's storage/lookup, not leaked into field implementations.

`ConfigPanel` also receives a `ctx: { allFields: FormField[] }` prop, used only by Calculation's source-field picker (which needs to see sibling Number fields) — an additive extension point, not something every field needs to use.

## 2. Conditional logic — single-pass, no fixpoint

`src/engine/conditions.ts` resolves each field's `{visible, required}` in **one pass**, with **no iteration and no cycle guard**:

```ts
function resolveFieldState(field, fields, rawValues) {
  const matchedEffects = field.conditions
    .filter(c => evaluateCondition(c, fields, rawValues))
    .map(c => c.effect)

  const visible = matchedEffects.includes('hide') ? false
    : matchedEffects.includes('show') ? true
    : field.defaultVisible

  const required = matchedEffects.includes('require') ? true
    : matchedEffects.includes('unrequire') ? false
    : field.config.required
  return { visible, required }
}
```

This isn't a simplification that skips edge cases — it's *provably correct* for chained conditions, because **every condition reads only the target field's raw stored value, never another field's resolved state**. There is no dependency graph between fields' resolved visibility, so a "chain" like *A hides B, C has a condition targeting B* resolves correctly in a single pass: C reads B's raw value directly, regardless of what B's own visibility resolves to.

**Multiple conditions on a field are independent rules (OR-like), not AND.** `Country equals India → show` and `Country equals USA → show` on the same field must both be able to activate it independently — AND-ing them would require both to hold simultaneously, which is impossible for a single-valued field and would make that whole class of configuration inexpressible. When two *different* effects match on the same dimension (one condition says `hide`, another says `show`), precedence decides: **hide > show**, **require > unrequire**.

**Hidden fields:** never validated as required (structurally — the submit pipeline only ever iterates *visible* entries, so a hidden field literally cannot produce a validation error), and excluded from `response.values` / the PDF. Their *stored* local value is left intact in memory while filling (not wiped), so toggling visibility back on doesn't lose what the user typed, and so other fields' conditions can keep reading it.

This is pinned down by 5 unit tests in `conditions.test.ts` (including the India/USA independent-rules case and the "target of a hide, still readable by a third field" case) plus 3 more in `visibility.test.ts` proving the hidden-required rule holds through the real submit pipeline, not just the resolver in isolation.

## 3. The shared pipeline — one anti-drift mechanism for submit and PDF

Three small pure functions compose in one direction:

```
rawValues (Fill's local state)
   → resolveFormValues(fields, rawValues)     // merges in Calculation results
   → resolveFieldStates(fields, rawValues)    // visibility/required, from RAW values only
   → getVisibleEntries(fields, resolvedValues, fieldStates)   // dumb filter + map
```

`FillPage.handleSubmit` and (indirectly) `exportPdf` both rely on this pipeline's output rather than each having their own notion of "which fields count." Concretely: **PDF export does not re-run this pipeline over an already-submitted response** — it trusts `response.values`'s keys as the already-finalized visibility decision from submit time. I initially assumed PDF export should re-run `resolveFieldStates` over the stored (already-filtered) values for consistency, but traced through a real bug: if field C's visibility depends on field B, and B was hidden and excluded from storage, re-evaluating C's condition against B's now-*absent* value would silently give the wrong answer. Trusting the stored keys instead of re-deriving them avoids this and is a *stronger* anti-drift guarantee — there's only one evaluation of the pipeline, ever, per response.

## 4. Calculation — hidden sources still count

`computeCalculations` aggregates (`sum`/`average`/`min`/`max`) over a Calculation field's source Number fields' **raw stored values**, regardless of whether those sources are currently visible. An empty/unfilled source counts as `0` for sum/min/max, and is excluded from the denominator for average. Rationale: a calculation is a derived quantity of the true entered data, not a "what's currently shown" summary — swapping which numbers count based on an unrelated field's visibility would make totals jump unpredictably. A Calculation can never source another Calculation (only fields with `config.type === 'number'` are eligible, checked structurally, not by convention).

## 5. Builder state — local draft, not a fat context

`TemplatesContext` is intentionally thin: `createTemplate` / `updateTemplate` / `deleteTemplate` only, each persisting the full collection. All field editing (add/remove/reorder/configure/conditions) happens in `src/builder/builderReducer.ts`, a `useReducer` local to the Builder page, seeded by `structuredClone`-ing the template on `/builder/:id` or a blank template on `/builder/new`. **Save** is the one moment the draft is committed back to `TemplatesContext`.

This matters because the alternative — field-editing actions living directly on `TemplatesContext` — has a real bug, not just a style problem: either every keystroke persists immediately (making the spec's explicit Save button meaningless), or the shared `templates` array shows unsaved edits everywhere it's read (a `TemplatesList` card's field count updating live from an in-progress, unsaved session, then silently reverting on refresh). The local-draft split makes "unsaved changes only exist in Builder, until Save" true by construction. `/builder/new` similarly holds a blank draft that isn't persisted to `TemplatesContext` until the first Save, so clicking "New Template" and navigating away doesn't leave a ghost "Untitled Form" behind.

## 6. PDF export — browser-native only

`src/pdf/exportPdf.ts` builds a self-contained HTML document (inline `<style>`, including `@media print` rules) and opens it via `window.open()` + `window.print()` — no PDF library, per the spec. `formatForDisplay`/`formatForDisplayList`/`renderForPdf` (from the registry) decide how each field renders: File Upload renders as a bullet list of `filename — size` (no claim of embedding, since only metadata is stored); Section Header renders as a real heading tag, not a label/value row.

**Fill Mode's own "Download PDF"** stays disabled (with a tooltip) until Submit actually creates a `FormResponse` — the spec requires the exported PDF to include a genuine submission timestamp, which doesn't exist pre-submit. Once enabled, it calls the exact same `exportResponseToPdf` function the Responses list uses for re-download — one PDF code path in the whole app, not two.
