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

---

## Implementation phase

### 6. Fill-page "Download PDF" — plausible-but-incorrect: built pre-submit live download, then rejected

**Prompt:** Before building further on top of it, asked to re-check the actual requirements doc (not memory) on two specific points: does Fill Mode need its own "Download PDF" separate from Submit, and do responses need a combined/bulk download option.

**What happened (the plausible-but-incorrect part):** The Step 8 implementation already in place had a `Download PDF` button on the Fill page that worked *before* Submit — exporting the current in-progress values with `new Date().toISOString()` standing in for a submission timestamp, since nothing had actually been submitted yet. This was a reasonable-looking reading of the spec's Fill Mode bullet list, which lists "Submit" and "Download PDF" as sibling actions one after another. But it directly conflicts with a separate part of the same spec: "The exported PDF must include: ... Submission timestamp." A PDF generated before Submit has no genuine submission event to timestamp — the code was internally consistent and looked done, but was quietly wrong against a requirement stated elsewhere in the doc.

**What was verified:** Re-extracted the actual requirements doc text fresh and grepped every PDF/download/instance mention end to end, rather than trusting the earlier read. Confirmed separately that no bulk/combined-download requirement exists anywhere — only "Each entry: submission timestamp, and a Re-download PDF button" (singular, per response).

**Rejected and changed:** Removed the pre-submit Fill-page Download PDF button and the `exportFillStateToPdf` function entirely. Submit was made the Fill page's only action, redirecting straight to the Responses list, where the single real PDF-export entry point (`exportResponseToPdf`) is immediately available with a genuine `submittedAt`. This only surfaced because a second read against the source document was requested before more work got built on top of the first version — it wasn't caught by any test or by re-reading the code in isolation.

---

### 7. Fill-page Download PDF, reconsidered again — disabled-until-submit instead of removed entirely

**Prompt:** After entry #6 removed Fill Mode's Download PDF button entirely, asked to add it back on the Fill page — but keep it disabled until the user has actually submitted.

**What happened:** This is a genuine design refinement, not a correction of an AI mistake — entry #6's "remove it entirely" was one valid resolution of the tension between "Download PDF is a Fill Mode action" (per spec) and "the exported PDF needs a genuine submission timestamp." Disabling the button until submit resolves the same tension without dropping the feature: Submit now creates the `FormResponse` and keeps the user on the Fill page (no more auto-redirect to Responses) instead of navigating away immediately, so the newly-enabled button has a real, just-created response to export.

**What was verified:** Confirmed the re-enabled button calls the exact same `exportResponseToPdf` function the Responses list uses for re-download — still one PDF-export code path in the app, just two places that can trigger it once a genuine `FormResponse` exists.

**Changed:** Submit no longer redirects to `/responses`; Fill shows a "Submitted ✓" state instead, with Download PDF now enabled. A follow-up request removed a "View Responses" link that had briefly been added alongside it, keeping the Fill page focused on the fill/submit/download loop — Responses stays reachable only from the template card and the Builder header.

---

## Design phase

### 8. Design retrofit build-order assumption invalidated mid-session — rewritten as a pure retrofit plan

**Prompt:** Review the standalone HTML design mockup against `docs/plan.md`, reconcile any conflicts, then prepare a step-by-step implementation plan in small, independently verifiable steps.

**What happened:** The first draft of `docs/design-build-steps.md` assumed the functional app hadn't been built yet, phasing design work alongside `docs/plan.md`'s original build order (Step 1 scaffold, Step 3 registry, etc.). Before executing Phase 1, a `git log` check (prompted by noticing `docs/plan.md` already contained wording that hadn't been written yet in this session) revealed the entire functional app — all 9 field types, engines, PDF export, README — had already been committed in a parallel/prior session while this session was still doing the design review. The build-order assumption in the draft plan was stale the moment it was written.

**What was verified:** Read the actual current `src/` file tree (fully populated, not empty) and compared the running app's styling (plain slate/blue default Tailwind) against the mockup to confirm the functional layer was complete but undesigned — a retrofit, not a greenfield build.

**Changed:** Rewrote `docs/design-build-steps.md` from scratch as a pure visual-retrofit plan, naming the actual existing files to edit per step instead of hypothetical future ones, with an explicit note that no engine/type/context file should change in any step — only styling.

---

### 9. Canvas selection color — matched the mockup faithfully, then reverted twice after live feedback

**Prompt:** "field when selected is highlighted with red color, remove this" — and, separately shortly after, "error should be displayed in sidebar form only, selected field has a red color, change it looks like their some error in field."

**What happened:** The mockup's selected-canvas-field style (`border-primary` `#ec6a49` + `bg-primary-tint`) was implemented faithfully against the design reference and confirmed via screenshot to match the mockup's Builder screen exactly. In actual use, though, that same coral/red-orange tone read as an error/broken state — reported twice, once on its own, and again once it was compounded with a red "(No label)" fallback text added for entry 10's validation feature.

**What was verified:** Checked computed styles to confirm the color really was the design system's `primary` accent token, not a stray danger-token bug — this was a genuine design-fidelity-vs-usability conflict, not a coding mistake, so the fix was a deliberate token swap rather than a bug fix.

**Rejected and changed:** Switched the selected-field style to a neutral `border-ink/40 bg-surface-sunken` (no red/orange at all), and separately removed the red "(No label)" canvas fallback text entirely, relocating all label/title validation messaging into the sidebar/header, inline next to the one input each error concerns (see entry 10).

---

### 10. Field-label-required validation — page banner first, then moved to per-field inline only

**Prompt:** "in template mode, fields can be saved with empty label, label should be required fields and checked before saving for all fields" — followed by "empty name saving for template name, should be required" — then "error should be displayed in sidebar form only" (entry 9).

**What happened:** The first implementation blocked Save when any field had an empty label, surfaced via a page-level red banner plus a red "(No label)" marker on the canvas row. Feedback in entry 9 redirected this: errors should live only next to the field they concern, not as a page-wide banner or a canvas-level color change.

**What was verified:** Confirmed `label` is a `BaseConfig` property shared by all 9 field types, so a single check (`config.label.trim() === ''`) generalizes with no per-type special-casing; confirmed via `tsc`/build that plumbing a new optional `labelError` through `BuilderContext` and every field's `ConfigPanel` type-checked cleanly end to end with no `any`.

**Changed:** Removed the page banner and canvas marker entirely. Added `labelError` to `BuilderContext`, threaded it into every field's `ConfigPanel` Label `TextField`, and gave the shared `TextField` component a new `error` prop (red border + inline message) reusing the same `aria-invalid` CSS variant already used by Fill-mode fields. Applied the identical required-before-save + inline-error pattern to the template title. Both errors derive live from state, so they disappear the instant the field is fixed — no separate clear-on-edit logic needed.

---

### 11. Single Line Text prefix/suffix silently missing from PDF/response payload

**Prompt:** "currently prefix and suffix is not part of exported pdf data, only typed string is shown. should we also show prefix and suffix in some way? wdyt" — followed by "but should we format it in some way for prefix and suffix can easily be identified in output?" — then "apply similar to number."

**What happened:** Number field's `formatForDisplay` already concatenated `prefix + value + suffix` (e.g. `$1,250.00`), correctly. Single Line Text's `formatForDisplay` returned the raw typed value only, silently ignoring its own `config.prefix`/`config.suffix` — an inconsistency against an existing, already-correct precedent in the same codebase, not an open design question.

**What was verified:** Confirmed `evaluateCondition`/`validate` for Single Line Text already correctly operate on the raw value and would be unaffected by a display-only fix. Recommended against adding visual separation between prefix/value/suffix in the PDF (brackets, spacing, distinct color) since prefix/suffix exist specifically so the value reads as one natural string (a URL, a currency amount) — and distinguishing them would fight the spec's explicit "a real document, not a debug dump" PDF-quality goal, plus would require `formatForDisplay`'s return type to change from plain string to HTML across all 9 field types for a cosmetic want.

**Changed:** Made Single Line Text's `formatForDisplay` mirror Number field's pattern exactly (`${prefix ?? ''}${value}${suffix ?? ''}`, empty when nothing typed). Verified end-to-end that a Website field with prefix `https://` / suffix `.com` now exports `https://acme.com` in the PDF instead of just `acme`.

---

### 12. Responses-list avatar — name-guessing heuristic added to match the mockup, then removed as unreliable

**Prompt:** (heuristic added earlier, unprompted, to match the mockup's named-respondent avatars) → "responses list page has a avatar componenet with ? in it. why do we need this? can we improve this UI" → "generic icon" → "remove name check, we cannot be sure that each form will have a name field."

**What happened:** To match the mockup's "Jane Doe"-style avatar initials, a `findDisplayName` heuristic had been added that regex-matches a Single Line Text field whose label mentions "name" and shows its first letter as the avatar. Since most real templates won't have such a field (an event survey, a feedback form), most responses hit the fallback, which originally rendered a bare `?` — a symbol that reads as "broken/error," not "no name available."

**What was verified:** Confirmed the fallback path would in fact be the *common* case for typical templates, not a rare edge case — meaning the heuristic mostly added a confusing default rather than a useful bonus for the majority of real usage.

**Rejected and changed:** First replaced the `?` fallback with a generic person-icon SVG per explicit request. Then, once the underlying assumption was challenged directly (not every form has a name field), removed `findDisplayName` and its conditional entirely — every response row now shows the same generic icon unconditionally, with no guessing.

---

### 13. Response Preview modal — deliberately not built on the interactive FormRenderer

**Prompt:** "add a preview button as well for each response which show previw of submmited form in modal view."

**What was considered:** Reusing the existing Builder `PreviewModal`/`FormRenderer` pattern (which renders real, interactive `FillField` components bound to local state) was the obvious shortcut, but would render already-submitted, finalized answers inside inputs that look clickable and editable yet silently do nothing when interacted with — misleading for data that can no longer change.

**What was verified:** Confirmed `exportPdf.ts` already establishes the correct pattern for displaying a finalized response: iterate `templateSnapshot.fields`, keep only those whose id is present in `values` (the already-finalized visible-fields set — deliberately not re-running the visibility engine, per the same reasoning already documented in `exportPdf.ts`), and render each via its registry `renderForPdf`/`formatForDisplay` hook.

**Changed:** Built `ResponsePreviewModal` as a read-only label/value list reusing those same registry hooks (Section Header renders as a heading divider, every other field as a label/value row) instead of duplicating the pipeline logic a third time or introducing a new shared abstraction for a small, self-contained amount of logic. Verified visually, using a response with both a text field and a Section Header, that both row kinds render correctly.

---

## Post-launch maintenance phase

### 14. Fallow dead-code audit — distinguishing real dead code from registry-pattern false positives

**Prompt:** Filled in a templated-but-empty `AGENTS.md`, then ran `fallow audit`/`dead-code`/`health` per the user's "yes, use fallow" to decide what was actually worth fixing.

**AI output:** Fallow flagged 10 "unused exports" — the 9 field-type definitions (`singleLineTextDefinition`, `numberDefinition`, etc.) plus `resolveFieldState` in `conditions.ts` — alongside one genuinely dead file (`Card.tsx`) and a misplaced build-only dependency.

**What was verified:** Traced each of the 9 field-definition exports by hand: every one is passed to `registerField()` at module scope and imported only for that side effect via `src/fields/index.ts`, a pattern static analysis can't see; `grep` confirmed none is otherwise imported by name. Separately traced `resolveFieldState` and found the tool's framing was misleading — it isn't unused, it's a private helper still called internally by `resolveFieldStates` in the same file. A blind "remove unused export" auto-fix would have deleted a function that's actually load-bearing; the correct fix was dropping only the `export` keyword.

**Rejected and changed:** Left the 9 field-registration exports untouched. Un-exported `resolveFieldState` (kept the function), deleted the genuinely-dead `Card.tsx`, moved `@tailwindcss/vite` to devDependencies, then executed a 6-task written plan (splitting `calculations.ts` to cut fan-in; deduplicating `isRangeValue`, text-field validation, and prefix/suffix input UI across field files) — duplication dropped from 515 lines (14.0%) across 12 files to 156 lines (4.3%) across 10, verified via `npm test`/`build`/`lint` plus a manual browser pass after every task before committing.

---

### 15. Condition-editor chip redesign — implemented, then reverted on explicit request

**Prompt:** "conditional select chip UI is weird, its height does not match other inputs and icons is also not looking good. Cross icon is in vertical center."

**AI output:** Normalized the effect-pill select, target-field select, and operator select to a shared explicit height (`h-8`), added right padding on all three so the native dropdown arrow had room, and restructured the row so the remove (✕) button sat in its own non-wrapping flex slot pinned to the top-right instead of trailing inline after three selects that could wrap onto multiple lines.

**What was verified:** Rebuilt the exact reported scenario in the browser (two fields, one condition) before and after the change, and screenshotted the result — the row still wrapped in the 320px sidebar, with the operator select dropping to its own line.

**Rejected and changed:** Immediately after the still-imperfect result was visible, the user said "revert chip changes" — reverted the file to its last committed state via `git checkout` rather than iterating further without direction. Left as an open item for a more deliberate follow-up pass (e.g. a narrower/stacked layout) instead of re-guessing at the same fix.

---

### 16. Post-launch UX reports — verified against the design mockup before fixing, not just from description

**Prompt:** A batch of UX reports in one message: "why today label in date fields if user can change dates?", "dashboard form card UI, responses text not in highlited color as per design", "currently we can not go back should we add a header."

**What was verified:** For the response-count color report, grepped the actual standalone mockup HTML (`docs/Form Builder - standalone.html`) rather than trusting the description alone, and found it explicitly renders `"N responses"` in `color: coral`, distinct from plain `"N fields"` text — confirming a concrete, unambiguous design-fidelity gap rather than a subjective preference. For the "Today" badge, traced that it renders from `config.prefillToday` (a Builder-time setting) rather than the field's live value, so it keeps reading "Today" after the date is edited away — confirmed via a manual Fill-mode test that changing the date left the badge unchanged. For the missing back-navigation, confirmed `ResponsesPage` already had a "Back to Templates" link but `BuilderPage`/`FillPage` had none.

**Changed:** Highlighted the response count in `text-primary` on dashboard cards; removed the stale Today badge from Fill mode only (kept the Builder checkbox and its prefill behavior unchanged); extracted the existing back-link into a shared `BackLink` component and added it to Builder's header and the top of Fill, so all three pages behave consistently. Each fix verified in the browser end to end before committing.

---

## Documentation phase

### 17. Manual QA testing plan — grounded in the actual implementation, not just the spec

**Prompt:** "review the assignment doc and prepare a detailed testing plan to test out all requirements, PDF, calculations, conditional logic, interaction between different fields — put it in `docs/` as a testing plan."

**AI output:** Before writing any test cases, read the assignment doc in full plus every engine file (`conditions.ts`, `visibility.ts`, `calculations.ts`), the PDF exporter, the registry, and each of the 9 field-type files, so the plan's test cases would assert the app's *actual* behavior (button labels, routes, exact validation messages) rather than a generic re-statement of the spec. Produced `docs/testing-plan.md`: ~140 IDed test cases across 13 sections (per field type, the full conditional-operator × effect matrix, calculation aggregation edge cases, PDF export, persistence, and cross-field integration scenarios), plus an explicit appendix cross-referencing every README-documented judgment call (OR-like conditions, hide>show precedence, hidden-source calculations still counting, select-by-id storage) to the test case that verifies it.

**What was verified:** Ran `npm run test` (6 files / 23 tests, all green) to confirm the plan's stated precondition — "the automated baseline must be green before manual QA starts" — was actually true at the time of writing, not just an assumed claim.

**Outcome:** Accepted as written; no rejected AI output on this task since it was research-then-document rather than a design decision with multiple candidate approaches.

---

### 18. "Adding a field type" guide — corrected the README's own extensibility claim

**Prompt:** "what steps should we take if we want to introduce a new field type" → clarified via question that the deliverable should be a written guide only, no code change.

**AI output:** Traced the actual extension points by reading `registry.ts`, `types/field.ts`, `fields/index.ts`, `BuilderPage.tsx`, `FormRenderer.tsx`, `FieldPalette.tsx`, `configPanelFields.tsx`, and `exportPdf.ts` to confirm which files a new field type genuinely requires touching, rather than restating the README's claim at face value. Produced `docs/adding-a-field-type.md` with a concrete step-by-step recipe, a `FieldDefinition` member reference table, and an illustrative (not committed) `Email` field skeleton.

**What was verified — and the discrepancy found:** `README.md` states adding a field type touches "exactly one new file... plus one import line." Tracing it by hand found this undercounts by one: TypeScript's closed discriminated union (`FieldType`/`FieldConfig` in `src/types/field.ts`) requires the new type to be added to both unions in that file — a second, small, unavoidable edit that isn't "one import line." This is a case where a documented claim in the codebase itself (not raw AI output) turned out to be slightly optimistic once traced against the actual type system constraints.

**Rejected and changed:** Wrote the guide with the accurate count — "one new file + two small mechanical edits" — with an explicit closing section naming the discrepancy against the README's phrasing, instead of silently repeating the friendlier-sounding but inexact original claim. Also updated `README.md` itself (§1) to match the corrected count and link to the new guide.
