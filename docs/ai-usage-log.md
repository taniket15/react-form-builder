# AI Usage Log

This log tracks significant AI-assisted decisions made while planning and building the Form Builder assignment. It's updated continuously as implementation proceeds, not written retroactively at the end. Entries are grouped by phase; each covers what was asked, what the AI produced, what was verified before accepting it, and what was rejected or changed.

Quality over volume, per the assignment brief — a handful of well-described entries below cover the decisions that actually shaped the codebase.

---

## Planning phase

### 1. Initial architecture design (field registry, engines, PDF export)

**Prompt:** Given the assignment spec (10 field types, conditional logic, calculations, PDF export, localStorage-only, no `any`), design the frontend architecture — specifically how to satisfy the grading criterion "can someone add an 11th field type without editing 6 existing files."

**AI output:** Proposed a field-type registry (`FieldDefinition<C,V>` interface, one file per field type, self-registration via a barrel import), pure `engine/` functions for conditional logic and calculations decoupled from React, and browser-native PDF export via `window.print()` + print CSS.

**Verified before accepting:** Cross-checked every spec requirement (10 field types, 3 Single Select display modes, conditional operators per field type, PDF must be browser-native) against the proposed architecture in a table to confirm nothing was silently dropped. Confirmed the registry pattern actually satisfies the "one file + one register call" extensibility bar by tracing what a hypothetical 10th field type would touch.

**Outcome:** Accepted as the foundational structure — this became architecture §1 (registry), §3–5 (engines), §8 (PDF) in `docs/plan.md`.

---

### 2. Conditional logic engine — fixpoint iteration (proposed, then removed)

**Prompt:** Design `resolveFieldStates` to correctly handle "chained conditions" (spec: a field's visibility can depend on another field, which may itself be conditionally hidden).

**AI output (first pass):** Proposed iterating `resolveFieldStates` to a fixpoint (re-run until the result stabilizes) with a cycle guard capped at `fields.length` iterations, reasoning that a field's state might depend on another field's *resolved* state.

**What was verified:** Traced through the actual evaluation code by hand for the scenario "A hides B, C has a condition targeting B." Found that conditions only ever read `rawValues[targetFieldId]` (raw stored values), never another field's resolved `{visible, required}` — meaning there is no dependency graph between fields' resolved states at all. `resolveFieldStates` is just `fields.map(f => resolveFieldState(f, rawValues))`, a single pass.

**Rejected and changed:** Removed the fixpoint/cycle-guard entirely once the "reads raw values only" invariant was confirmed — it was solving a problem that the design's own rules had already made impossible. This is documented explicitly in `docs/plan.md` §3 as a correction from an earlier draft, specifically so the reasoning survives (not just the conclusion) in case the invariant ever changes.

---

### 3. Plausible-but-incorrect AI output: "AND" prose contradicting its own code sketch

**Context:** While documenting the multiple-conditions rule, the AI wrote (in an earlier revision of `docs/plan.md` §3): *"conditions on a field are combined with **AND** within an effect... trivial here since each condition maps to exactly one effect and we just check membership in `matchedEffects`."*

**Why this is the plausible-but-incorrect example:** The prose sounds reasonable in isolation and even references the correct code — but the code sketched immediately above it in the same section does the opposite of AND:

```ts
const matchedEffects = field.conditions
  .filter(c => evaluateCondition(c, rawValues[c.targetFieldId]))
  .map(c => c.effect);

const visible = matchedEffects.includes('hide') ? false
  : matchedEffects.includes('show') ? true
  : field.defaultVisible;
```

`matchedEffects.includes('show')` is `true` if **any** condition with effect `show` matched — that's OR-like independent-rule semantics, not AND. Framing it as AND is actively wrong: for a config like `Country equals India → show` and `Country equals USA → show`, true AND semantics would require *both* to hold simultaneously, which is impossible for a single-valued field and would make "show for any of these values" impossible to express — defeating the whole point of letting a field have multiple conditions.

**What was verified:** Manually traced the India/USA example through the actual code (not just re-read the prose) and confirmed the code was always correct — only the prose describing it was wrong. This passed through at least one prior review round undetected because reviewers were reading the code as correct and the adjacent prose as a separate, plausible-sounding claim, without checking the two against each other.

**What was rejected and changed:** Rewrote §3 to correctly name this "independent rules, not AND," with the India/USA example inline as the canonical illustration, and added a unit test (`resolveFieldStates`: two `show` conditions on different values both able to activate the field) specifically to pin this down before implementation starts.

---

### 4. `FormResponse.templateSnapshot` — partial snapshot rejected in favor of full clone

**Prompt:** How should a submitted `FormResponse` handle the fact that its parent `FormTemplate` can keep changing after submission (fields renamed, added, removed)?

**AI output (first pass):** Proposed `templateSnapshot: { title: string; fields: FormField[] }` — a hand-picked subset of the template, just enough to re-render a submission.

**What was verified:** Considered what happens when `FormTemplate` gains a new top-level property later (description, versioning, etc.) — the hand-picked snapshot type would need to be manually kept in sync in three places (the type itself, the submit mapper, the PDF renderer), and any place that forgets creates silent drift between "what a template is" and "what a snapshot of a template is."

**Rejected and changed:** Replaced with `templateSnapshot: FormTemplate` (the entire template, via `structuredClone(template)` at submit time) — one model of "what a template is," no duplicate type to keep in sync, and a stronger invariant ("a submission contains the exact template that produced it"). Storage size is a non-concern at this scale, so there was no real trade-off being given up.

---

### 5. Builder state — fat `TemplatesContext` rejected in favor of local draft + thin context

**Prompt:** Design the state layer for Builder Mode (add/reorder/configure fields, edit conditions) given the spec's explicit "Save button — persists the template to localStorage."

**AI output (first pass):** Put field-editing actions directly on `TemplatesContext` (`addField`, `updateFieldConfig`, `addCondition`, etc.), with the context itself persisting to localStorage.

**What was verified:** Worked through what happens if every keystroke in the config panel dispatches through the shared context: either every action persists immediately (making the spec's explicit Save button meaningless), or the in-memory `templates` array reflects unsaved edits everywhere it's read — e.g. a `TemplatesList` card's field count would appear to update live from an in-progress, unsaved Builder session, then silently revert on refresh once storage reloads the last-saved version. Confirmed this was a real bug path, not a style preference.

**Rejected and changed:** Split into a thin `TemplatesContext` (collection CRUD only: `createTemplate`/`updateTemplate`/`deleteTemplate`) plus a local `builderReducer` draft that Builder edits in memory and commits only on Save. Also added `/builder/new` (a blank draft not persisted until first Save) to avoid "New Template" clicks creating ghost entries. Added an explicit manual-verification step ("edit a field, navigate away without saving, confirm the edit is gone") to the implementation checklist specifically to catch a regression here.
