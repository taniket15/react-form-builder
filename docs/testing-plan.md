# Form Builder — Manual QA Testing Plan

This is a manual, browser-driven test plan for the Form Builder take-home app. It maps every requirement in `docs/Form Builder — Frontend Take-Home Assignment.docx` to concrete test cases, and — per the project's own documented judgment calls — asserts the behavior the README (`README.md`) commits to for the spec's ambiguous areas (conditional-logic AND/OR semantics, hidden-source calculations, select-by-id storage, etc.), rather than treating those as undefined.

Each test case has a unique ID, preconditions, steps, and an expected result. IDs are stable so a run can be tracked as a checklist (☐/✅) across regressions.

---

## 0. How to run

```bash
npm install
npm run dev        # http://localhost:5173 — manual QA target
npm run test       # vitest — engine unit-test baseline (run first, must be green)
npm run build      # tsc -b (typecheck) + vite build — type-safety gate
npm run lint       # eslint
```

- **Reset state between suites**: DevTools → Application → Local Storage → `localhost:5173` → delete the three keys `formbuilder:v1:templates`, `formbuilder:v1:responses`, `formbuilder:v1:schemaVersion` (or run `localStorage.clear()` in the console), then refresh. Do this before §3 and before any suite that assumes a clean Templates List.
- **Pop-ups must be allowed** for the test origin — PDF export (`src/pdf/exportPdf.ts`) opens a new tab via `window.open()` and calls `window.print()`; a blocked pop-up shows an alert instead ("Please allow pop-ups...") which is itself worth a smoke check (TC-PDF-11).
- Routes referenced below: `/` (Templates List), `/builder/new`, `/builder/:id`, `/fill/:templateId`, `/template/:id/responses`.

---

## 1. Automated-coverage baseline (reference, not re-tested manually)

The engine layer — the highest-risk correctness surface (conditional logic, calculations, PDF row-building) — already has a vitest suite. Run it first; a green suite is a **precondition** for the manual passes below, which focus on UI/integration paths the suite doesn't reach (per README: "no automated browser-driven test of the full Builder → Fill → Submit → PDF flow").

| TC ID | File | What it locks down |
|---|---|---|
| TC-AUTO-01 | `src/engine/conditions.test.ts` | Condition resolution incl. India/USA independent-OR case, hidden-target-still-readable-by-third-field case |
| TC-AUTO-02 | `src/engine/visibility.test.ts` | Hidden-required-never-validated through the real submit pipeline |
| TC-AUTO-03 | `src/engine/calculations.test.ts` | Sum/avg/min/max, hidden-source-still-counts |
| TC-AUTO-04 | `src/engine/formValues.test.ts` | Calculation merge into resolved values |
| TC-AUTO-05 | `src/pdf/exportPdf.test.ts` | `buildRowsHtml`/`renderFieldRow` pure HTML logic |
| TC-AUTO-06 | `src/utils/formatDateTime.test.ts` | Timestamp formatting |

**Action:** `npm run test` → expect all suites passing, 0 failures, before starting §3 onward.

---

## 2. Templates List (Home) — `TC-HOME-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-HOME-01 | Fresh state, visit `/` | Empty state: "No forms yet" message + "+ New template" button |
| TC-HOME-02 | Click "+ New template" | Navigates to `/builder/new` with a blank draft (no fields, default title) |
| TC-HOME-03 | Create 2+ templates, add fields, Save, return to `/` | Each card shows: title, `N field(s)`, `N response(s)` (coral/primary-colored count), "Last modified {date}" |
| TC-HOME-04 | Click anywhere on a template card (not the two buttons) | Navigates to `/builder/:id` (edit mode), loaded with that template's fields |
| TC-HOME-05 | Click "New response" on a card | Navigates to `/fill/:templateId`, opens a **fresh** instance (not tied to any prior response) |
| TC-HOME-06 | Click "Responses" on a card | Navigates to `/template/:id/responses` |
| TC-HOME-07 | Submit a response for template A, return to `/` | Template A's card response count increments by 1; card is otherwise unaffected |
| TC-HOME-08 | Keyboard: Tab to a card, press Enter/Space | Same navigation as a click (card has `role="button"`, keydown handler) |
| TC-HOME-09 | Edit template A's title/fields via Builder, Save, return to `/` | A's card `updatedAt`/"Last modified" reflects the new save time; field count updates |

---

## 3. Builder Mode — `TC-BUILD-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-BUILD-01 | `/builder/new`, click a field type in the left palette | Field appended to the canvas with that type's default config |
| TC-BUILD-02 | Drag a palette item onto the canvas (if drag-to-add is wired, per dnd-kit) | Field added at drop position |
| TC-BUILD-03 | Add 3+ fields, drag one to reorder (dnd-kit sortable) | Canvas order updates immediately; order persists after Save + refresh |
| TC-BUILD-04 | Click a field on the canvas | Right config panel shows that field's config, matching its type (only the selected field's panel shown) |
| TC-BUILD-05 | Change a config value (e.g. label), click a different field, click back | Edited value is retained (draft state, not lost) |
| TC-BUILD-06 | Edit fields, click Save | `localStorage['formbuilder:v1:templates']` updated; refresh page → same state loads |
| TC-BUILD-07 | Leave a field's Label empty, click Save | Save blocked; inline label error shown in the right sidebar for that field (`BuilderContext.labelError`), not on the canvas |
| TC-BUILD-08 | Click Preview | Opens Fill Mode inline/modal using the **current unsaved draft** — lets you test conditionals/calculations before Save |
| TC-BUILD-09 | Edit template title | Persists on Save; reflected in Templates List card and Fill Mode header |
| TC-BUILD-10 | Delete a field from the canvas | Field removed; any condition on another field that targeted it should be handled gracefully (see TC-COND-13) |
| TC-BUILD-11 | Go to `/builder/new`, add fields, **navigate away without Save** | Return to `/` — no ghost "Untitled Form" template was created (README §5: `/builder/new`'s draft isn't persisted to `TemplatesContext` until first Save) |
| TC-BUILD-12 | Open an existing template at `/builder/:id`, make edits, **navigate away without Save** | Template on `/` is unchanged — edits were local-draft only |

---

## 4. Field types — config + fill + validation

### 4.1 Single Line Text — `TC-FIELD-SLT-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FIELD-SLT-01 | Set placeholder text | Fill Mode input shows placeholder when empty |
| TC-FIELD-SLT-02 | Toggle Required on, leave blank, Submit | Validation error, submit blocked |
| TC-FIELD-SLT-03 | Set min length 5, enter 3 chars, Submit | Error referencing min length |
| TC-FIELD-SLT-04 | Set max length 5, enter 10 chars, Submit | Error referencing max length |
| TC-FIELD-SLT-05 | Set prefix `https://` and suffix `.com` | Fill Mode renders static, non-editable prefix/suffix flanking the input (`AffixWrapper`) |
| TC-FIELD-SLT-06 | Fill with prefix/suffix set, Submit, check PDF | PDF value shows the full text (prefix/suffix are cosmetic wrapper only — verify against `formatForDisplay`, since the config's prefix/suffix are static decoration, not stored in the value — confirm whether PDF includes them or just the typed value) |

### 4.2 Multi-line Text — `TC-FIELD-MLT-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FIELD-MLT-01 | Set rows = 6 | Fill Mode textarea renders with 6 visible rows |
| TC-FIELD-MLT-02 | Min/max length same as SLT | Same validation behavior, on a textarea |
| TC-FIELD-MLT-03 | Enter multi-line text with line breaks, Submit, check PDF | PDF preserves line breaks (`white-space: pre-wrap` on `.pdf-field-value`) |

### 4.3 Number — `TC-FIELD-NUM-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FIELD-NUM-01 | Set min 0, max 100; enter -5 / 150 | Both rejected on Submit with min/max message |
| TC-FIELD-NUM-02 | Set decimalPlaces = 2; enter `3.456` | Rejected: "allows at most 2 decimal place(s)" |
| TC-FIELD-NUM-03 | Set decimalPlaces = 0; enter `7` | Accepted |
| TC-FIELD-NUM-04 | Set prefix `$`, suffix `kg`; enter 42 | Fill shows `$` / `kg` as static affixes; submitted/PDF value formatted as `$42kg` per `formatForDisplay` |
| TC-FIELD-NUM-05 | Type `-` then `3.` then backspace to `""` | No premature coercion/clearing mid-typing — input stays exactly what was typed (string-backed value, README judgment call) |
| TC-FIELD-NUM-06 | Enter non-numeric garbage that still passes as text (shouldn't be possible via `inputMode="decimal"`, but paste text) | Rejected: "must be a valid number" |
| TC-FIELD-NUM-07 | Leave required Number blank, Submit | Required error, not a NaN/parse error |

### 4.4 Date — `TC-FIELD-DATE-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FIELD-DATE-01 | Enable "Pre-fill with today's date", open via **New Response** | Field auto-populates with today's date on load |
| TC-FIELD-DATE-02 | Same config, re-open an **already-submitted** response (Responses → Preview) | Shows the value **as submitted**, not re-prefilled to "today" at view time |
| TC-FIELD-DATE-03 | Set min/max date; pick a date outside range via keyboard entry (native picker may block, but verify submit-time validation too) | Rejected with "must be on/before/after" message |
| TC-FIELD-DATE-04 | Leave required Date blank, Submit | Required error |
| TC-FIELD-DATE-05 | Fill a date, Submit, check PDF | PDF shows locale-formatted date (`toLocaleDateString()`), not raw ISO string |

### 4.5 Single Select — `TC-FIELD-SS-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FIELD-SS-01 | Add/remove/reorder options in OptionsEditor | Canvas + Fill Mode reflect updated option list and order |
| TC-FIELD-SS-02 | Set displayType = Radio; select an option, Submit | Correct option id stored; required validation works if toggled |
| TC-FIELD-SS-03 | Set displayType = Dropdown; same field/options | Renders as `<select>`; same selection/required behavior as Radio |
| TC-FIELD-SS-04 | Set displayType = Tiles; same field/options | Renders as clickable tiles; selected tile visually distinct (primary border/tint); same selection/required behavior |
| TC-FIELD-SS-05 | For each of the 3 display types: leave required Single Select unselected, Submit | Identical required-error behavior across all three (spec: "selected option and required validation must behave identically across all three") |
| TC-FIELD-SS-06 | Select an option, Submit, check PDF | Shows the option's **label** (via `formatForDisplay`), not its id |
| TC-FIELD-SS-07 | After a response is submitted, go back to Builder and **rename** the chosen option's label | Old response's PDF/preview still shows a label — since storage is by id, verify whether rename correctly propagates label lookup, or whether the old snapshot's option list (frozen in `templateSnapshot`) still has the original label (expected: the *snapshot's* frozen options are used, so rename doesn't corrupt old responses — README decision) |

### 4.6 Multi Select — `TC-FIELD-MS-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FIELD-MS-01 | Select 2 of 4 checkboxes | Both stored as an id array |
| TC-FIELD-MS-02 | Set minSelections=2, select 1, Submit | Error: "Select at least 2 option(s)" |
| TC-FIELD-MS-03 | Set maxSelections=2, select 3 (if UI allows) or verify checkbox toggling caps correctly | Error: "Select at most 2 option(s)" if exceeded |
| TC-FIELD-MS-04 | Field not required, minSelections=2, leave **completely empty**, Submit | **Allowed** — empty + optional passes even though it's below minSelections (README §"Other judgment calls": empty-optional is valid; only a *partial* selection below the min is an error) |
| TC-FIELD-MS-05 | Field required, leave empty, Submit | Rejected: required error |
| TC-FIELD-MS-06 | Select multiple, Submit, check PDF | Shows comma-joined labels, in option order or selection order (verify against `formatForDisplay`) |

### 4.7 File Upload — `TC-FIELD-FU-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FIELD-FU-01 | Set allowedTypes = `.pdf,.jpg`; upload a `.png` | File silently filtered out (not added to the list) — extension mismatch |
| TC-FIELD-FU-02 | Set allowedTypes = `.PDF` (uppercase) or filename `Doc.PDF`; upload | Case-insensitive match succeeds (README decision) |
| TC-FIELD-FU-03 | Set maxFiles = 2; attempt to add a 3rd file | List capped at 2 (`combined.slice(0, maxFiles)`); confirm no error state client-side vs. silent trim — document actual behavior |
| TC-FIELD-FU-04 | Upload files, remove one via ✕ | List updates; removed file no longer counted toward maxFiles |
| TC-FIELD-FU-05 | Required + no files, Submit | Error: "is required" |
| TC-FIELD-FU-06 | Upload files, Submit, check PDF | Shows `filename (size) — file not embedded` per file; no attempt to embed content |
| TC-FIELD-FU-07 | Attempt to add this field as a condition **target** in another field's ConditionsEditor | File Upload is **not offered** in the target dropdown (no `conditionOperators` registered) |

### 4.8 Section Header — `TC-FIELD-SH-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FIELD-SH-01 | Set size = XS/Small/Medium/Large/XL in turn | Fill Mode heading visibly changes weight/size at each level (`text-sm`→`text-2xl`, `font-semibold`→`font-bold`) |
| TC-FIELD-SH-02 | Section Header present in Fill Mode | No input, no value captured, never appears in errors or as a `values` key |
| TC-FIELD-SH-03 | Submit a form containing a Section Header, check PDF | Renders as a real heading tag (`h1`–`h5` per size, per `PDF_HEADING_TAG`) with a bottom border — not a label/value row |
| TC-FIELD-SH-04 | Try to target a Section Header from another field's condition | Not offered as a target (no `conditionOperators`) |

---

## 5. Conditional Logic — `TC-COND-*` (verified against README §2)

Setup convention: build a small template with 2–4 fields wired with the condition under test; use Preview or a real Fill instance.

### 5.1 Operator matrix (one field type as condition target at a time)

| TC ID | Target type | Operator | Steps | Expected |
|---|---|---|---|---|
| TC-COND-01 | Single/Multi-line Text | equals | Target = "USA", show dependent field only when text field == "USA" | Shows only on exact match |
| TC-COND-02 | Text | does not equal | Same, invert | Shows when value ≠ "USA" (including empty) |
| TC-COND-03 | Text | contains | Target contains substring "abc" | Shows when substring present |
| TC-COND-04 | Number | equals | Target number == 5 | Exact match only |
| TC-COND-05 | Number | is greater than | Target > 10 | Boundary: 10 itself does NOT match, 11 does |
| TC-COND-06 | Number | is less than | Target < 10 | Boundary: 10 itself does NOT match, 9 does |
| TC-COND-07 | Number | is within range | min=5, max=10 | 5 and 10 inclusive match; 4 and 11 don't |
| TC-COND-08 | Single Select | equals | Target option id == "India" | Match only on selected option |
| TC-COND-09 | Single Select | does not equal | Invert of above | — |
| TC-COND-10 | Multi Select | contains any of | compare = {A, B}; target selects A only | Matches (any overlap) |
| TC-COND-11 | Multi Select | contains all of | compare = {A, B}; target selects only A | Does NOT match (needs both) |
| TC-COND-12 | Multi Select | contains none of | compare = {A, B}; target selects C only | Matches (no overlap) |
| TC-COND-13 | Date | equals | exact date match | — |
| TC-COND-14 | Date | is before | strictly earlier | Boundary: equal date does NOT match |
| TC-COND-15 | Date | is after | strictly later | Boundary: equal date does NOT match |

### 5.2 Effects

| TC ID | Steps | Expected |
|---|---|---|
| TC-COND-16 | Condition effect = Show, target unmatched → matched | Field transitions hidden → visible in real time as the target value changes (no page reload/re-render needed) |
| TC-COND-17 | Condition effect = Hide, target matched | Field disappears from the form immediately |
| TC-COND-18 | Condition effect = Mark as required, target matched | Field's `*` required marker appears; leaving it blank now blocks Submit |
| TC-COND-19 | Condition effect = Mark as not required, target matched | A field that's normally required becomes optional; Submit succeeds even if blank |

### 5.3 Defaults

| TC ID | Steps | Expected |
|---|---|---|
| TC-COND-20 | Field's Default visibility = Hidden, no condition matches (target field empty) | Field stays hidden by default |
| TC-COND-21 | Field's Default visibility = Visible, no condition matches | Field stays visible by default |
| TC-COND-22 | Default required = Required, no `require`/`unrequire` condition currently matches | Field enforces required per its base config |

### 5.4 Enforced rules (spec + README)

| TC ID | Steps | Expected |
|---|---|---|
| TC-COND-23 | Field hidden (by condition), also marked required (default or via condition), Submit | **No validation error for it** — hidden fields are structurally excluded from validation (only visible entries are iterated) |
| TC-COND-24 | Same setup, Submit successfully, inspect `localStorage['formbuilder:v1:responses']` and the exported PDF | Hidden field's key/value is **absent** from both — not merely blank |
| TC-COND-25 | Open a field's ConditionsEditor | The field itself does **not** appear in its own "when" target dropdown (self-target structurally excluded, `targetableFields` filters `f.id !== field.id`) |
| TC-COND-26 | Toggle the target field's value back and forth several times | Dependent field's visibility/required state updates on every change, live, no stale state |

### 5.5 Multiple conditions — OR-like independence (README §2)

| TC ID | Steps | Expected |
|---|---|---|
| TC-COND-27 | Field X has 2 conditions: `Country equals India → Show`, `Country equals USA → Show` | Selecting **either** India or USA shows X; selecting a third country hides it (both rules are independent, not AND'd) |
| TC-COND-28 | Field X has: `A equals 1 → Show` and `B equals 2 → Hide`, set A=1 and B=2 simultaneously | **Hide wins** — X is hidden (README precedence: hide > show) |
| TC-COND-29 | Field X has: `A equals 1 → Require` and `B equals 2 → Unrequire`, set both conditions true | **Require wins** — X is required (README precedence: require > unrequire) |

### 5.6 Chained conditions (single-pass resolver correctness)

| TC ID | Steps | Expected |
|---|---|---|
| TC-COND-30 | Field B: `A equals X → Hide`. Field C: condition targets **B's raw value** (e.g. `B equals Y → Show`). Set A=X (hiding B) and set B's stored value to Y before it was hidden, or via Preview timing | C still resolves correctly off B's raw value regardless of B's own visibility (README §2: "no dependency graph... C reads B's raw stored value directly") |
| TC-COND-31 | 3-field chain: A drives B's visibility, B drives C's visibility (C targets B) | Toggling A cascades correctly to both B and C in the UI, live |

---

## 6. Calculation — `TC-CALC-*` (verified against README §4)

| TC ID | Steps | Expected |
|---|---|---|
| TC-CALC-01 | Create Calculation field, source = 2 Number fields, aggregation = Sum | Result = sum of both, updates live as either Number field changes |
| TC-CALC-02 | Aggregation = Average, 3 sources, fill 2, leave 1 blank | Average computed over the **2 filled** values only (blank excluded from denominator, not treated as 0) |
| TC-CALC-03 | Aggregation = Sum/Min/Max, 3 sources, fill 2, leave 1 blank | Blank source counts as **0** for sum/min/max (README §4) — verify Min in particular (a blank 0 could wrongly become the min if a filled value is positive) |
| TC-CALC-04 | Set decimalPlaces = 2 on the Calculation | Result rounds/formats to 2 decimals |
| TC-CALC-05 | Attempt to type into the Calculation field in Fill Mode | Field is **read-only** — no input accepted, always derived |
| TC-CALC-06 | In Builder, try to add a Calculation field as a **source** of another Calculation | Not offered in the source-field picker (only `config.type === 'number'` fields eligible) |
| TC-CALC-07 | Make one of the Calculation's Number sources **conditionally hidden**, hide it, verify Calculation's result | Hidden source's raw value **still counts** in the aggregation (README §4 — a calculation reflects true entered data, not "what's currently shown") |
| TC-CALC-08 | Submit with a Calculation field present, check submitted value + PDF | Calculation's computed value appears correctly in both, using the same resolved value as Fill Mode showed |
| TC-CALC-09 | Zero sources filled at all (all blank), Sum aggregation | Result = 0, no crash/NaN |

---

## 7. Fill Mode & Submit — `TC-FILL-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-FILL-01 | Open `/fill/:templateId` for a template with all 10 field types | Every field renders per its config; page not broken by any type |
| TC-FILL-02 | Fill several fields, leave a required one blank, click Submit | Blocked; error banner shows count ("N field(s) need your attention"); per-field error shown inline; **no `FormResponse` created** |
| TC-FILL-03 | Fix the error, Submit again | Succeeds: "Submitted ✓" badge appears; Download PDF becomes enabled |
| TC-FILL-04 | Before Submit, check Download PDF button | Disabled, with tooltip "Submit the form first" (README §6) |
| TC-FILL-05 | After Submit, click Download PDF | Opens the print/PDF tab for the response just created |
| TC-FILL-06 | After a successful Submit, edit field values further and Submit again | Verify actual behavior: does it create a **second** `FormResponse` or update the first? (Confirm against `createResponse`/reducer — spec doesn't mandate re-submit UX, document what happens) |
| TC-FILL-07 | Fill a form with a live conditional (target + dependent), watch it update | Dependent field shows/hides without needing to blur/tab away — updates on every keystroke/change event |
| TC-FILL-08 | Refresh mid-fill (before Submit) | Per README, unsaved Fill-mode entries are **not** persisted (only Builder drafts persist locally, and only real submits persist responses) — confirm values are lost on refresh, which is expected, not a bug |

---

## 8. Filled Instances / Responses — `TC-RESP-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-RESP-01 | Visit `/template/:id/responses` for a template with 0 responses | Empty state: "No responses yet" + "+ New response" button |
| TC-RESP-02 | Submit 2+ responses, revisit Responses list | Each entry shows: submission timestamp, "Preview" button, "↓ PDF" (re-download) button; sorted newest-first (`submittedAt` descending) |
| TC-RESP-03 | Click "Preview" on an entry | Opens `ResponsePreviewModal` rendering that response's values (read-only view) |
| TC-RESP-04 | Click "↓ PDF" (re-download) | Re-opens the same PDF content as the original download — byte-for-byte reproducible, same `exportResponseToPdf` code path |
| TC-RESP-05 | Submit a response, then go edit the **live template** (rename a field's label, delete a field, add a new field), then Preview/re-download the **old** response | Old response still renders/exports with its **original** field labels and structure — sourced from `templateSnapshot`, unaffected by the live template's later edits (README schema rationale) |
| TC-RESP-06 | Delete a field from the live template that a response answered, save the template, revisit that old response | Old response's PDF/preview still shows the now-deleted field and its answer (snapshot-based, not live-template-based) |

---

## 9. PDF Export — `TC-PDF-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-PDF-01 | Submit a response, download PDF | Document `<title>` and visible `<h1>` show the **form title** |
| TC-PDF-02 | Same | Timestamp line shows "Submitted {formatted date/time}" matching `submittedAt` |
| TC-PDF-03 | Form with 5+ fields in a specific order, submit, check PDF | Field rows appear in the **same order** as the form/canvas, not alphabetical or insertion order |
| TC-PDF-04 | Form with a Hide-conditioned field currently hidden, submit, check PDF | Hidden field's row is **completely absent** — no blank row, no label shown |
| TC-PDF-05 | File Upload field with attachments, check PDF | Shows `filename (size) — file not embedded` per file (no attempt to embed binary content) |
| TC-PDF-06 | Section Header present, check PDF | Renders as a real heading element with border, sized per XS–XL mapping (`h1`–`h5`), not as a label/value row |
| TC-PDF-07 | A visible, optional field left blank, submit, check PDF | Shows italic "(no answer)" placeholder, not a broken/empty row |
| TC-PDF-08 | Field label/value containing HTML-special characters (`<`, `>`, `&`, quotes) | Properly escaped (`escapeHtml`) — no HTML injection/broken layout in the PDF tab |
| TC-PDF-09 | Print the opened tab (Cmd/Ctrl+P or the auto-triggered `window.print()`) to an actual PDF file | Output reads as a real export — serif body font, uppercase muted labels, bold values, page margins via `@page` — not a raw debug dump |
| TC-PDF-10 | Inspect `package.json` dependencies | No PDF-generation library (e.g. jsPDF, pdfmake) present — confirms browser-native-only per spec |
| TC-PDF-11 | Block pop-ups in the browser, click Download PDF | `window.alert('Please allow pop-ups...')` shown instead of a silent failure |
| TC-PDF-12 | Construct the "hidden dependency" edge case: Field C's visibility condition targets Field B, B is conditionally hidden and excluded from `response.values` | PDF still resolves C correctly using the **stored key presence** in `values`, not by re-deriving from now-absent B (README §3) — verify C's correct inclusion/exclusion, not a crash or wrong guess |

---

## 10. Persistence & schema — `TC-PERSIST-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-PERSIST-01 | Create templates + responses, **full page refresh (Cmd/Ctrl+R)** at `/` | All templates and response counts intact |
| TC-PERSIST-02 | Refresh while sitting on `/builder/:id` after Save | Draft reloads from the saved template correctly |
| TC-PERSIST-03 | Refresh while sitting on `/fill/:templateId` mid-entry (unsaved) | Confirms TC-FILL-08 — in-progress fill values are expected to reset (not silently corrupted) |
| TC-PERSIST-04 | Inspect DevTools → Local Storage | Exactly 3 keys present: `formbuilder:v1:templates`, `formbuilder:v1:responses`, `formbuilder:v1:schemaVersion`; shapes match README schema (`FormTemplate[]`, `FormResponse[]`, version number) |
| TC-PERSIST-05 | Manually corrupt one key via DevTools (e.g. set to invalid JSON), reload | App doesn't hard-crash to a blank white screen — check actual failure mode (error boundary, fallback to empty list, or console error) and document it |
| TC-PERSIST-06 | Clear all 3 keys, reload | App boots to a clean empty Templates List, no console errors |

---

## 11. Cross-field interaction scenarios — `TC-XFIELD-*`

Integration scenarios combining multiple mechanisms in one flow, to catch drift between subsystems that unit tests (each testing one engine function) wouldn't catch.

| TC ID | Scenario | Expected |
|---|---|---|
| TC-XFIELD-01 | Single Select "Country" (India/USA/Other) → conditionally Shows a Number field "Tax ID length" only for India/USA (OR-like, TC-COND-27) → that Number field feeds a Calculation "Total" (Sum) with another always-visible Number field. Set Country=Other (hiding the Number field), then submit. | Number field excluded from submitted data & PDF (hidden); **Calculation still includes its raw value** in the sum (README §4, hidden sources still count) — the two rules coexist correctly in one flow |
| TC-XFIELD-02 | A Date field with "pre-fill today" feeds a condition (`Date is after 2026-01-01 → Show` a dependent field), on a **New Response** | Dependent field's visibility correctly reflects the auto-prefilled date immediately on load, without requiring the user to touch the Date field |
| TC-XFIELD-03 | Multi Select drives `contains all of {A,B} → Require` on a Single Line Text field; select only A; attempt Submit; then select B too | First attempt: text field not required (partial match), submit succeeds/fails based on its own state; second attempt: text field becomes required, blank now blocks submit — required-effect toggles live off a multi-value comparison |
| TC-XFIELD-04 | Two Calculation fields both sourcing overlapping Number fields, one Sum one Average, with one source conditionally hidden | Both calculations independently reflect the correct aggregation over raw values, hidden or not — no cross-talk between the two Calculation fields |
| TC-XFIELD-05 | Full lifecycle: Builder → add all 10 field types with at least one conditional and one calculation → Save → Preview (inline) → close → New Response (real Fill) → fill → Submit → Download PDF → re-download from Responses list | End-to-end works with no console errors at any step; PDF from both paths is identical |

---

## 12. Type-safety & build gate — `TC-BUILDTS-*`

| TC ID | Steps | Expected |
|---|---|---|
| TC-BUILDTS-01 | `npm run build` | `tsc -b` passes with zero errors, then Vite production build succeeds |
| TC-BUILDTS-02 | `npm run lint` | Zero ESLint errors/warnings |
| TC-BUILDTS-03 | `grep -rn ": any" src/` (spot check) | No `any` used as an escape hatch outside the one documented, deliberate type-erasure point in `src/fields/registry.ts` (`registerField`'s `as unknown as AnyFieldDefinition` cast) |
| TC-BUILDTS-04 | Serve the production build (`npm run preview`) and repeat a smoke pass of §2–§9 | Behavior matches dev-mode — no dev-only behavior masking a prod bug |

---

## 13. Product-thinking / documented judgment calls — verification appendix

These aren't bugs to file — they're the spec's ambiguous 10–20% resolved by explicit decisions in `README.md`. Each row below is a verification note confirming the app matches its own documented intent (cross-referenced to the test cases above that exercise it).

| Judgment call (README) | Verified by |
|---|---|
| Multiple conditions sharing an effect are OR-like, not AND | TC-COND-27 |
| Conflicting effects: hide > show, require > unrequire | TC-COND-28, TC-COND-29 |
| Hidden field never validated, excluded from values/PDF, structurally (not just by convention) | TC-COND-23, TC-COND-24 |
| Calculation aggregates raw values regardless of source visibility | TC-CALC-07, TC-XFIELD-01 |
| Calculation cannot source another Calculation | TC-CALC-06 |
| Select values stored as option `id`, not label | TC-FIELD-SS-06, TC-FIELD-SS-07 |
| Number values stored as `string` to avoid mid-typing coercion | TC-FIELD-NUM-05 |
| Multi Select: empty+optional allowed, partial-below-min rejected | TC-FIELD-MS-04, TC-FIELD-MS-02 |
| File Upload matches by extension (case-insensitive), not MIME type | TC-FIELD-FU-01, TC-FIELD-FU-02 |
| `required` lives once on `BaseConfig`, no per-type second property | Implicit in TC-FIELD-* required tests behaving uniformly |
| PDF trusts submitted `values` keys, doesn't re-derive visibility | TC-PDF-12 |
| `templateSnapshot` clone means old responses survive live template edits | TC-RESP-05, TC-RESP-06 |
| `/builder/new` draft not persisted until first Save (no ghost template) | TC-BUILD-11 |
| Download PDF disabled pre-Submit (needs a real timestamp) | TC-FILL-04 |

---

## Sign-off checklist

- [ ] §1 automated suite green (`npm run test`)
- [ ] §2–§4 all field types pass config/fill/validation cases
- [ ] §5 conditional logic operator matrix + effects + precedence + chaining all pass
- [ ] §6 calculation aggregation + real-time + hidden-source rules pass
- [ ] §7–§8 Fill/Submit/Responses lifecycle passes
- [ ] §9 PDF export quality checks pass, including the hidden-dependency edge case
- [ ] §10 persistence survives full refresh, schema matches README
- [ ] §11 cross-field integration scenarios pass
- [ ] §12 build/lint/type-safety gate passes
- [ ] §13 judgment-call appendix cross-checked, no undocumented deviation found
