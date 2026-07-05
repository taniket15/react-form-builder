# Design plan — step-by-step implementation

## Note: this is a retrofit, not a greenfield build

`docs/plan.md` was written when the repo had no code. Since then, the full functional app has been implemented and committed (`378fe3f`…`8b7fb59`): all 9 field types, the conditions/calculations engines with unit tests, submit + validation, Responses, PDF export, Preview modal, and the README — all working, using **generic unstyled Tailwind** (slate/blue palette, system sans-serif, no tokens). `docs/design-plan.md`'s decisions (Download-PDF-on-Fill, no text pattern, aggregation-only Calculation) are **already reflected in the current code** — confirmed by reading `FillPage.tsx`, `exportPdf.ts`, and the commit log (`a4ae382`).

So this plan is a **pure visual retrofit**: swap the generic Tailwind styling for the mockup's design system, file by file, without touching functional logic (engines, contexts, reducers, tests). Every step below names the **actual existing file(s)** to edit.

**Standard verify loop:** `npm run build` (must stay clean — no functional changes expected), then run the app (`npm run dev`) and the mockup (served over HTTP, not `file:`) side by side in Chrome via Playwright MCP, screenshot the changed screen, and compare.

---

## Phase 1 — Design foundation

- [x] **1.1 Tailwind v4 theme tokens** — added an `@theme` block to `src/index.css` with the full palette (`--color-bg`, `-surface`, `-surface-sunken`, `-primary`, `-primary-tint`, `-ink`, `-ink-soft`, `-muted`, `-calc`/`-calc-tint`, `-success`/`-success-tint`, `-danger`/`-danger-tint`) plus `--font-sans`/`--font-serif` overrides; `body` sets `background-color`/`color` from tokens.
  **Verified:** `npm run build` clean; live app background computed as `rgb(246,242,234)` (`#f6f2ea`), text `rgb(46,42,36)` (`#2e2a24`).
- [x] **1.2 Self-host Figtree** — downloaded the Figtree variable woff2 (covers weights 300–900 in one file) from Google Fonts' CDN directly (not extracted from the mockup bundle) into `public/fonts/Figtree-Variable.woff2`; one `@font-face` with `font-weight: 300 900` in `src/index.css`.
  **Verified:** `document.fonts` reports `Figtree 300 900 loaded`; network panel shows only `GET /fonts/Figtree-Variable.woff2` (local), zero requests to `fonts.googleapis.com`/`gstatic.com`.

## Phase 2 — Shared primitives (retrofit existing components first)

- [x] **2.1 `Button`** (`src/components/common/Button.tsx`) — `primary` = `bg-primary` orange fill/white text, `secondary` = warm border + `surface` bg, `danger` recolored to the danger token; radius 10.
  **Verified:** TemplatesListPage's "New Template" button renders as solid orange, matching mockup Screen 01.
- [x] **2.2 `TextField` + shared field CSS classes** (`src/components/common/TextField.tsx`; new `.field-label`/`.field-input`/`.field-input-addon`/`.field-select`/`.field-error` component classes added to `src/index.css` under `@layer components` so every field file's repeated inline className strings become one-line swaps in Phase 3) — warm border, radius 10, primary focus ring, and `aria-invalid:` variants that auto-redden the border/ring (existing `aria-invalid={!!error}` props already passed by every field's `FillField` pick this up for free, no per-field logic change needed).
  **Verified:** Builder ConfigPanel's Number field TextFields (Label, Min/Max, Decimal places) render with warm rounded borders.
- [x] **2.3 `Checkbox`** (`src/components/common/Checkbox.tsx`) — native checkbox with `accent-primary` (computed `accent-color: rgb(236,106,73)` confirmed via devtools), sized `size-4`.
  **Verified:** "Visible by default" checkbox in Builder's ConfigPanel checked-state uses the orange accent color.
- [x] **2.4 New `Badge` primitive** (`src/components/common/Badge.tsx`) — variants `required`/`show`/`hide`/`count`/`today`/`calc`.
  **Verified:** rendered all 6 variants via a temporary injected DOM node (not committed to any source file) — pill backgrounds/text colors matched exactly (e.g. `required` computed `rgb(253,236,236)` = `#fdecec` danger-tint). One gotcha found: the Tailwind v4 dev server needs a restart after new component files are added — its scanner didn't pick up `Badge.tsx`'s class strings until restarted.
- [x] **2.5 New `CategoryLabel` + `Card`** (`src/components/common/`) — `.category-label` CSS class (uppercase, tracked, muted) wrapped by a `CategoryLabel` component; `Card` = rounded-xl warm-bordered surface panel.
  **Verified:** type-checks clean; visual confirmation deferred to Phase 3 wiring (both are currently unused imports-in-waiting).

## Phase 3 — Apply per screen (existing pages/components, one at a time)

- [x] **3.1 `TemplatesListPage.tsx`** — warm tokens throughout; cards `rounded-xl` + `surface` bg + hover primary border; added a proper "No forms yet" empty-state card with its own CTA (previously just a plain sentence); copy tightened to match mockup ("Your forms", "+ New template", "New response", "Responses").
  **Verified:** empty-state and populated-card screenshots both match mockup Screens 01/01b.
- [x] **3.2 `BuilderPage.tsx` + `FieldPalette.tsx` + `Canvas.tsx`** — warm header/palette/config-panel chrome; palette rail `surface-sunken` + `CategoryLabel` "Add a field"; selected canvas field gets `border-[1.5px] border-primary bg-primary-tint`.
  **Verified:** live screenshot — orange border+tint on selection; palette already listed all 9 registered types (registry-driven, nothing to change).
- [x] **3.3 Canvas field badges** — added `REQUIRED` and `SHOWN IF <target> <op> <value>` / `HIDDEN IF …` `Badge`s next to each canvas field's label in `Canvas.tsx`, derived from `field.config.required` and `field.conditions[0]` (pure display; new `describeCondition`/`describeValue` helpers resolve select option ids to labels and range objects to `min–max` — no engine changes).
  **Verified:** live screenshot shows a required field with both `REQUIRED` and `SHOWN IF Single Select = …` pills, matching Screen 02.
- [x] **3.4 Field `FillField` styling — group A** (`src/fields/SingleLineText.tsx`, `NumberField.tsx`, `DateField.tsx`) — all now use `.field-label`/`.field-input`/`.field-input-addon`/`.field-error`; Number shows a "N decimal place(s)" caption when `decimalPlaces > 0`; Date shows a `today` `Badge` when `prefillToday`.
  **Verified:** live Fill screenshot — `$` prefix chip, "2 decimal places" caption, orange `TODAY` pill, warm rounded inputs; all 23 unit tests still pass; `npm run build` clean.
- [x] **3.5 Field `FillField` styling — group B** (`src/fields/SingleSelect.tsx`, `MultiSelect.tsx`) — radio uses `accent-primary`; dropdown uses `.field-select`; tiles use the same `border-[1.5px] border-primary bg-primary-tint` selected style as Canvas (3.2/3.3); Multi Select checkboxes use `accent-primary` + a "Choose N–M" caption derived from `minSelections`/`maxSelections`.
  **Verified:** live Fill screenshot — selected tile shows orange outline+tint, "Choose 1–3" caption renders under Multi Select; build/tests clean.
- [x] **3.6 Field `FillField` styling — group C** (`src/fields/FileUpload.tsx`, `SectionHeader.tsx`, `Calculation.tsx`, `MultiLineText.tsx`) — File Upload is now a dashed drop-zone ("Drop files or browse") with a "`.pdf, .docx` · max N" caption (native `<input type=file>` still handles both click-to-browse and OS-level drag-drop, just visually hidden via `sr-only`, so this is styling-only); Section Header renders as a bold heading with a bottom border divider; Calculation shows a `calc`-token chip + `Σ <Aggregation>` `Badge`, and its `ConfigPanel` gains a live "Sum of Guests" — style preview caption via a new `describeAggregation` helper (aggregation + source labels only, no `+1` offset, confirming the decision already baked into the engine); Multi-line Text shows a `N / max` counter when `maxLength` is set.
  **Verified:** live Fill screenshot with all 9 field types filled shows dashed dropzone + caption, bold "Section" divider, purple "Σ SUM" chip showing a live-computed `42`, and the char counter — matches Screen 03; build/tests clean.
- [x] **3.7 `FillPage.tsx` layout** — added the "Fields marked `*` are required" note (was missing); "Submitted ✓" is now a `Badge` (`show` variant) instead of plain green text.
  **Verified:** live screenshot matches Screen 04; Download PDF still disabled pre-submit (no logic change).
- [x] **3.8 `ConditionsEditor.tsx`** — reordered each row to `<effect select styled as a colored pill> when <target select> <operator select>` (JSX reorder only — `handleAdd`/`updateCondition`/`handleTargetChange`/`ValueEditor` all untouched); heading now reads `Conditions on "<field label>"` with a `count` `Badge` showing rule count; added the precedence footnote text.
  **Verified:** live screenshot with 2 rules on a Single Select field — "Conditions on "Single Select" · 2 RULES" heading, green SHOW pills, precedence sentence all render correctly; build/tests clean.
- [x] **3.9 Validation presentation** (`FillPage.tsx`) — per-field red border + inline message already flow through `.field-input`'s `aria-invalid:` variant and `.field-error` (from Phase 2/3.4-3.6, no extra work needed); added the top banner "N field(s) need(s) your attention before you can submit." when `errorCount > 0`.
  **Verified:** live screenshot — entering `1.2345` into a 2-decimal Number field shows the red banner ("1 field needs your attention…"), red field border, and the inline "Number allows at most 2 decimal place(s)" message, matching Screen 06.
- [x] **3.10 `ResponsesPage.tsx`** — added `findDisplayName` (looks for a Single Line Text field whose label mentions "name"; returns `null` if none — no guessing) driving an avatar-initial chip + optional name line above the timestamp; `↓ PDF` button; proper "No responses yet" empty-state card with a "+ New response" CTA (previously a plain sentence).
  **Verified:** live screenshot — two responses listed with `?` chip (no name field in this test template) + timestamps + `↓ PDF`, matching Screen 07; build/tests clean.

## Phase 4 — PDF export design (`src/pdf/exportPdf.ts`)

- [x] **4.1 Retrofit `buildHtmlDocument`'s inline `<style>`** (`src/pdf/exportPdf.ts`) — whole document now uses Georgia serif; timestamp uses a monospace stack; labels/colors switched to warm ink/muted hexes; `.pdf-section-header` is now a bottom-border divider (was top-border) with uppercase letter-spacing. Kept `@media print` margins and `break-inside: avoid` unchanged; didn't touch any `pdf-*` class *names* since `exportPdf.test.ts` asserts on them.
  **Verified:** opened the real print window via the Responses list's "↓ PDF" button (Playwright: click opens a new tab because `window.print()` blocks the click's own resolution — select the new tab via `browser_tabs`, don't wait on the click) — serif bold title, monospace timestamp, bold underlined "Section" divider, bold serif values, all matching Screen 08; `npm run test` still 23/23 passing.
- [x] **4.2 Download-PDF-on-Fill** — already implemented in the codebase before this design pass (commit `a4ae382`, predating this session's design review): `FillPage.tsx` keeps `Download PDF` disabled with a tooltip until Submit creates a real `FormResponse`, then calls the same `exportResponseToPdf`. This matches the reconciliation decision in `docs/design-plan.md` (Download PDF stays on Fill) — no functional change needed, only the Phase 3.7 restyling already done.
  **Verified:** already exercised during 3.7/3.9 screenshots (disabled pre-submit, enabled + "SUBMITTED ✓" badge post-submit).

## Phase 5 — Final polish

- [x] **5.1 Sweep for leftover generic classes** — `grep -rn "slate-\|blue-[0-9]\|red-[0-9]\|green-[0-9]" src/` caught 3 files Phase 3 hadn't explicitly covered: `DefaultVisibilityToggle.tsx`, `PreviewModal.tsx`, `OptionsEditor.tsx` — all fixed (accent-primary checkbox, warm modal chrome, `.field-input`/`.field-label` reuse, primary link color). No `/styleguide` route was ever created (Badge was spot-checked via temporary injected DOM nodes instead — see Phase 2 notes).
  **Verified:** re-ran the grep after fixing — zero hits outside token definitions; `npm run build` and `npm run test` (23/23) clean.
- [x] **5.2 Full visual pass** — every screen was screenshotted and compared against the mockup as each phase landed: dashboard empty/populated, Builder shell + canvas condition/required badges, all 9 field types together in Fill, tile/radio selection states, Conditions editor with 2 rules, validation error banner, Responses list, the real PDF print window (serif/mono/warm), Preview modal, Options editor.
  **Verified:** cumulative evidence from Phases 1–5 above; final `npm run build` + `npm run test` (23/23) clean, no functional regressions from this styling-only pass.

---

### Notes
- No engine, context, reducer, or type file should change in this plan — if a step seems to require one, stop and re-scope it as display-only (e.g. 3.3's badges are read from existing `FormField` data, not new state).
- Each step is independently committable (`style(<scope>): ...` or `feat(ui): add Badge/CategoryLabel primitives`) and keeps `npm run dev` runnable throughout.
- Verification uses the already-installed Chrome via Playwright MCP against the app served by `npm run dev`, and the mockup served over HTTP (not `file:`, which Playwright blocks).
