# Documentation Index

## Living reference (kept current)

| Doc | Covers |
|---|---|
| [`../README.md`](../README.md) | Onboarding, localStorage schema, a scannable summary of the core architectural decisions |
| [`decisions.md`](decisions.md) | The extended "why" behind each architectural decision — moved out of the README to keep it a scan |
| [`architecture.md`](architecture.md) | System shape — layer map, the registry + engine pipeline, data flow, invariants table |
| [`adding-a-field-type.md`](adding-a-field-type.md) | Step-by-step guide to adding a new field type |
| [`extending.md`](extending.md) | Recipes for other extensions — condition operator, calculation aggregation, schema migration |
| [`ai-development.md`](ai-development.md) | The AI-assisted development playbook — skills/tools, planning flow, prompt patterns that held up |
| [`ai-usage-log.md`](ai-usage-log.md) | Chronological log of significant AI-assisted decisions (assignment requirement — not a playbook, the actual record) |
| [`testing-plan.md`](testing-plan.md) | Manual QA test plan mapping every spec requirement to a test case |

## Reference assets (inert, not maintained as docs)

| File | What it is |
|---|---|
| [`Form Builder — Frontend Take-Home Assignment.docx`](Form%20Builder%20—%20Frontend%20Take-Home%20Assignment.docx) | The original assignment spec |
| [`Form Builder - standalone.html`](Form%20Builder%20-%20standalone.html) | A static, non-interactive mockup of every screen/state, used as the visual design reference |

## Archive (`archive/` — historical, not maintained)

Point-in-time planning documents, kept for the design/decision trail but **not updated as the codebase changes** — treat these as "what we were thinking at the time," not current truth. Current architecture lives in `architecture.md`; current field-type count and behavior live in the code and `../README.md`.

| Doc | What it was |
|---|---|
| [`archive/plan.md`](archive/plan.md) | The original pre-code architecture/build-order plan (written before any source existed; some details, e.g. field-type count, are now stale) |
| [`archive/design-plan.md`](archive/design-plan.md) | Reconciliation of the static mockup against `plan.md` before the visual retrofit began |
| [`archive/design-build-steps.md`](archive/design-build-steps.md) | The step-by-step visual-retrofit plan executed against the already-functional app |
