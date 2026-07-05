# Reconcile `plan.md` with the design reference

## Context

The repo has a written architecture plan (`docs/plan.md`) and a **static design reference sheet** (`docs/Form Builder - standalone.html` — a bundled React page that renders one long scroll of 8 numbered sections showing every screen/state; it is a mockup, not an interactive app). The plan was written with **no visual direction** ("Tailwind" only). This task reviewed the design against the plan to (a) fold the design's visual system into the plan so the eventual build matches the mockup, and (b) resolve the few places where the design and plan disagree.

**Outcome of the review:** alignment is strong. The design visually confirms the plan's hardest decisions — independent-rules conditions, precedence (`Hide > Show`, `Require > Unrequire`), hidden-fields-excluded-from-output, decimal-place/min-max/file-extension validation, and the browser-native serif PDF with Section-Header dividers + "(file not embedded)". The work here is therefore **additive (adopt the design system) plus three small reconciliations**, not a rethink.

The only files edited are `docs/plan.md` (fold in the design) and, optionally, `docs/ai-usage-log.md` (log the reconciliation decisions). No source code exists yet; this keeps the plan and the design as a single source of truth before Step 1 scaffolding begins.

## Three reconciliations (user-decided)

1. **Download PDF stays on the Fill page** (design wins over plan §9/§11's removal).
   - Fill mode keeps both `Submit` and `Download PDF` side by side (matches the mockup).
   - `Download PDF` runs the **same** `resolveFormValues → resolveFieldStates → getVisibleEntries` pipeline + validation as Submit, then exports via `exportPdf` using `new Date()` as the timestamp (export-time, since no persisted `submittedAt` need exist yet). It does **not** require a prior Submit and does **not** create a `FormResponse`.
   - Re-download from the Responses list still uses the saved `templateSnapshot` + stored `submittedAt` (unchanged). Preview-in-Builder still hides Download PDF (builder testing must not mint PDFs).
   - **Plan edits:** revise §9 `Fill` bullet and §9 `Preview` note and §11 "No separate Download PDF on Fill" — replace the "removed from Fill" reasoning with the above. `exportPdf(response)` gains a sibling path that takes `{template, values, timestamp}` directly so Fill can export without a `FormResponse`; both paths share the same HTML renderer.

2. **No pattern/regex on Single Line Text** (plan wins). The design's `Referral code · "Doesn't match the required format"` state is treated as illustrative only. `SingleLineText` config stays `label, placeholder, required, minLength, maxLength, prefix, suffix` — **no change to plan.md needed** beyond a one-line note that this validation state is intentionally not built.

3. **Calculation is aggregation-only** (plan wins). The mockup caption `Sum of Guests + 1` / `= guests + 1` is cosmetic; no arithmetic offset or expression engine. `computeCalculations` stays sum/avg/min/max over source Number fields. In Fill/PDF the read-only caption reads like `Sum of Guests` (aggregation + source labels), never `+ 1`. **No change to plan.md logic**; add a one-line note that the design's `+1` caption is not implemented.

## Design system to add to `plan.md` (new subsection under §Architecture, "0. Visual design system")

Encode as Tailwind theme tokens in `tailwind.config` + a small `index.css` `@theme`/`:root` block. These are the extracted values from the mockup:

**Palette**
| Token | Hex | Use |
|---|---|---|
| `bg` (app canvas) | `#f6f2ea` | page background |
| `surface` | `#fffdf9` | cards, panels, inputs |
| `surface-sunken` | `#f1eadd` / `#efe9dd` | palette rail, config panel |
| `primary` | `#ec6a49` | buttons, selected tile/radio/check, accents |
| `primary-tint` | `#fdeee9`/`#fcf3ef` | selected/hover backgrounds, avatar chips |
| `ink` | `#2e2a24` | headings/body |
| `ink-soft` | `#4a4436` | secondary text |
| `muted` | `#8a7f6d` | captions, category labels, placeholders |
| `calc` (accent) | indigo/purple (`#ddd7f0` bg, `~#5b52c9` text) | Calculation field value + `Σ` badge |
| `success` (condition badge) | soft green (`#d3e5d9` bg) | `SHOWN IF …` / SHOW pills |
| `danger` | `#d64545` (+ `#fdecec` bg) | validation errors, HIDE pills, submit-blocked banner |

**Type**
- **Figtree** — all UI (weights 400/600/800). Google font → **self-host/bundle** the woff2 (no external CDN); the mockup already embeds it. Add to plan Step 1.
- **Georgia / serif** — PDF document title + Responses "Event Registration" heading + PDF section dividers.
- **Monospace** — PDF `Submitted …` timestamp, field-type category labels, calc formula caption.

**Recurring motifs** (build as shared primitives in Step 9's `components/`)
- Uppercase, letter-spaced, `muted` **category label** above each field type (`SINGLE LINE · PREFIX/SUFFIX`).
- **Badge/pill** primitive with variants: `REQUIRED` (danger-tint), `SHOWN IF X = Y` / `SHOW` (success), `HIDE` (danger), `1 RULE`/`3 RULES` (neutral count), `TODAY` (primary-tint), `Σ CALCULATION` (calc).
- Cards/inputs radius **10–14**, panels **16–20**; 1px warm borders; generous padding.
- Selected states: **orange 1.5px outline** for tiles/radios/the selected canvas field; orange fill for checkboxes/radio dot.

## Per-screen mapping (add as short design notes next to the matching plan §)

- **§9 TemplatesList** — cards: bold title, `N fields · N responses` meta, `New response` (primary) + `Responses` (ghost) actions, `+ New template` header button. Empty state: centered icon + "No forms yet" + primary CTA. (Screens 01/01b.)
- **§9 Builder** — 3-pane: left `ADD A FIELD` rail (must list **all 9** types — mockup shows only 6 for space), center canvas with per-field `REQUIRED`/`SHOWN IF …` badges and orange selection outline, right config panel headed `<Field type> · Editing <label>` with `OPTIONS` and `CONDITIONS (N RULE)` sections. (Screen 02.)
- **§1 field gallery** — 9 types render exactly as Screen 03: prefix/suffix chips on inputs, `0 / 500` counter on multi-line, `$` prefix + "2 decimal places" caption on Number, `TODAY` badge + calendar affordance on Date, radio/dropdown/tiles for Single Select, orange checkboxes + "Choose 1–3" for Multi Select, dashed "Drop files or browse" + "type · max N" for File Upload, bold underlined "Payment details" for Section Header, purple read-only chip + `Σ` for Calculation.
- **§3/§10 Conditions editor** — row = `<EFFECT pill> when <target> <operator> <value>`, range operator = two boxed inputs, `+ Add condition`, and the **precedence footnote** ("Hide beats Show, Require beats Unrequire. A hidden field is never validated and is left out of the response & PDF") rendered as helper text. (Screen 05.)
- **Validation (Screen 06)** — inline red message under each field + red border + a top `"N fields need your attention before you can submit."` banner. Covers required/minLength/number-range/decimals/min-date/multiselect-min/file-type/max-files. (No "required format"/pattern — decision 2.)
- **§9 Responses (Screen 07/07b)** — per-template list: avatar initial chip, name, `date · time`, `↓ PDF` button; empty state mirrors dashboard empty state with `+ New response`.
- **§8 PDF (Screen 08)** — serif title, monospace `Submitted <date> · <time>`, Section Headers as **bold underlined section dividers** (`ATTENDEE`, `TICKETS`), label-left/value-right-bold rows, Calculation value inline, `filename.pdf (file not embedded)`.

## Files to modify
- `docs/plan.md` — add §0 Visual design system (tokens/type/motifs table above); apply the 3 reconciliation edits (§9 Fill+Preview, §11 Fill-PDF note, and two one-line "not implemented" notes for pattern + calc-offset); sprinkle the per-screen design notes; add "self-host Figtree woff2 + configure Tailwind theme tokens" to Step 1 and the Step 1 checklist.
- `docs/ai-usage-log.md` — optional: log the three reconciliation decisions (download-PDF-on-Fill, no-pattern, aggregation-only) with rationale.

## Verification
- Re-read `docs/plan.md` after edits: the three conflicts are resolved and internally consistent (no lingering "no Download PDF on Fill" sentence; §8 `exportPdf` mentions the Fill export-time path).
- Spot-check that every color/font/radius referenced in the new §0 table actually appears in the mockup (already extracted: bg `#f6f2ea`, primary `#ec6a49`, Figtree, serif PDF, radius 10–20).
- Confirm the plan still claims exactly **9 registry field types** and the palette-lists-all-9 note is present (mockup only draws 6 in the rail).
- No code changes to verify at this stage; the design tokens get exercised for real in build Step 1 (Tailwind theme) and Step 9 (polish), where a side-by-side against each mockup screen is the acceptance check.

## Cleanup note
This review generated screenshot artifacts in the repo working tree (`design-01.png`, `band-*.png`, `.playwright-mcp/`) that were previously a clean tree. Delete them (or add to `.gitignore`) before any commit — they are not part of the deliverable.
