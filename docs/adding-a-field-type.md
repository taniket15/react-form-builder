# Adding a New Field Type

The evaluation bar for this app is: *"Can someone add an 11th field type without editing 6 existing files?"* The answer is yes, via a **field-type registry** — every field type implements one `FieldDefinition<C, V>` interface (`src/fields/registry.ts`) and self-registers with `registerField(...)` at module load. Every consumer (Builder palette, config panel host, Fill renderer, conditional-logic engine, calculation engine, PDF export) looks the definition up from the registry instead of branching on a hardcoded field-type list — so none of them change when a type is added.

**Headline: 1 new file + 2 small mechanical edits. Everything else is free.**

```
Builder palette ──┐
Config panel host ─┤
Fill renderer ──────┼──▶  getFieldDefinition(type) / getAllFieldDefinitions()  ◀── registry.ts
Conditions engine ──┤              ▲
Calculations engine ┤              │ registerField(...)
PDF export ─────────┘              │
                          src/fields/<YourType>.tsx   (the only new file)
```

## The 3 files you touch

| File | Why | Kind |
|---|---|---|
| `src/types/field.ts` | Add the type to the `FieldType` union, define `<YourType>Config extends BaseConfig`, add it to the `FieldConfig` union | edit (mechanical) |
| `src/fields/<YourType>.tsx` | Implement `FieldDefinition<C, V>` and call `registerField(...)` | **new file** |
| `src/fields/index.ts` | Add `import './<YourType>'` (the barrel — imports every field file for its self-registration side effect) | edit (1 line) |

Without the registry, the same change would touch ~8 files: the palette, the Builder add-handler, the config panel switch, the Fill renderer, three engine functions, and PDF export. The registry collapses all of that to the table above.

## Step-by-step

### Step 1 — Declare the type & config (`src/types/field.ts`)

```ts
export type FieldType =
  | 'singleLineText'
  | ... 
  | 'yourType'          // add here

export interface YourTypeConfig extends BaseConfig {
  type: 'yourType'
  // type-specific options only — label/required already come from BaseConfig
}

export type FieldConfig =
  | SingleLineTextConfig
  | ...
  | YourTypeConfig       // add here
```

`BaseConfig` already gives every field `label: string` and `required: boolean` — reuse it, don't redeclare `required` a second time (the engine reads `field.config.required` generically without narrowing on type first; a second required-like property would be a second source of truth that can disagree). `config.type` is the sole discriminant — there's no separate top-level `type` on `FormField`.

### Step 2 — Implement the field (`src/fields/YourType.tsx`)

Implement every member of `FieldDefinition<C, V>` (`C` = your config type, `V` = your value type):

**Required members**

| Member | Purpose |
|---|---|
| `type`, `label`, `icon` | Identity + what shows in the palette |
| `createDefaultConfig()` | Config used when the field is first added |
| `ConfigPanel` | Builder's right-panel editor. Reuse `LabelRequiredFields` and, if numeric, `DecimalPlacesField` from `src/fields/configPanelFields.tsx` instead of hand-rolling the label/required pair |
| `FillField` | Fill Mode's rendered input. Read `config.required` for the `*` marker and validation — a condition's `require`/`unrequire` effect is threaded in by `FormRenderer` overriding `config.required` before handoff, so no extra prop is needed |
| `getInitialValue(config)` | Value when a new Fill instance opens |
| `validate(value, config)` | Return `string \| null`; called only for currently-visible fields (hidden fields are never validated — that's structural in `src/engine/visibility.ts`, not something your `validate` needs to check) |

**Optional hooks — add only if they apply to your type**

| Hook | Add it if... | Notes |
|---|---|---|
| `conditionOperators` + `evaluateCondition` | Your type should be usable as a condition **target** | Omit both entirely for non-targetable types (Section Header, File Upload, and Calculation all omit them today). `ConditionsEditor` filters targetable fields by checking `conditionOperators !== undefined` on the registry entry — nothing to wire up by hand |
| `formatForDisplay(value, config)` | Your type has a value that should appear as a label/value row in the submitted-response view and PDF | Return a plain string; empty string renders as "(no answer)" |
| `renderForPdf(config)` | Your type is a structural, value-less element (like Section Header) that should render as a heading instead of a label/value row | Presence of this hook vs. `formatForDisplay` is the capability signal the PDF/response renderer checks — don't set both |

End the file with:
```ts
registerField(yourTypeDefinition)
```

**Type-safety note:** the one deliberate type-erasure point in the app is inside `registerField` itself (`as unknown as AnyFieldDefinition`, so the registry `Map` can hold 9+ different concrete `(config, value)` pairs). Your field file stays fully typed against its own concrete `YourTypeConfig`/`Value` — never introduce `any` in the field file to work around this; the cast is already contained where it needs to be.

### Step 3 — Register it (`src/fields/index.ts`)

```ts
import './SingleLineText'
...
import './YourType'   // add this line
```

The import's side effect is the registration. Import order determines the palette's display order.

### Step 4 — Tests (recommended, not a new-file requirement)

If your type is a condition target or a Calculation source (only `type === 'number'` fields are eligible sources, checked structurally in `src/engine/calculations.ts` — non-Number types are never offered), add a case to the relevant existing suite (`src/engine/conditions.test.ts`, `calculations.test.ts`). Otherwise, a small test of your own `validate()` is enough. Follow the existing test files' pattern — they're the pure-function engine layer, no React needed.

## What you get for free

Once Steps 1–3 are done, the following require **zero further edits**:
- Palette button (icon + label) appears in Builder's left panel
- Click-to-add creates the field with your `createDefaultConfig()`
- Selecting it renders your `ConfigPanel` in the right sidebar
- Fill Mode renders your `FillField`, wired to live values
- Required-marker and validation-on-submit wiring
- Conditional show/hide/require targeting **other** fields still works form-wide; if you added `conditionOperators`, other fields can now target **yours** too, automatically appearing in `ConditionsEditor`'s dropdown
- Calculation eligibility, if applicable (Number types only, by design)
- PDF export row (or heading, if you used `renderForPdf`)
- Submitted-response preview modal

## Worked mini-example (illustrative only — not committed code)

A hypothetical `Email` field, showing the shape without implementing every line:

```tsx
// src/fields/Email.tsx
type Value = string

function createDefaultConfig(): EmailConfig {
  return { type: 'email', label: 'Email', required: false }
}

function validate(value: Value, config: EmailConfig): string | null {
  if (value === '') return config.required ? `${config.label} is required` : null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : `${config.label} must be a valid email`
}

export const emailDefinition: FieldDefinition<EmailConfig, Value> = {
  type: 'email',
  label: 'Email',
  icon: '✉️',
  createDefaultConfig,
  ConfigPanel: (props) => <LabelRequiredFields {...props} />, // + any email-specific options
  FillField: /* renders <input type="email">, mirrors SingleLineText.tsx's FillField shape */,
  getInitialValue: () => '',
  validate,
  conditionOperators: [
    { operator: 'equals', label: 'equals' },
    { operator: 'contains', label: 'contains' },
  ],
  evaluateCondition: (operator, targetValue, compareValue) => {
    const compare = typeof compareValue === 'string' ? compareValue : ''
    return operator === 'equals' ? targetValue === compare : targetValue.includes(compare)
  },
  formatForDisplay: (value) => value,
}

registerField(emailDefinition)
```

`SingleLineText.tsx` is the closest real template to copy from — same `Value = string` shape and a similar `equals`/`contains` operator set.

## Verification

1. **`npm run build`** — `tsc -b` will immediately flag a missing `FieldConfig` union member or any place that switches over `FieldType` without handling the new case. The type system is the safety net for Step 1.
2. **`npm run test`** — engine suite still green; add your new cases if applicable.
3. **Manual smoke test**: Builder → new type appears in the palette → add it → configure it → Preview → fill it in Fill Mode → Submit → Download PDF shows it correctly. If it's targetable, confirm it appears in another field's condition "when" dropdown, and that another field can be configured to show/hide/require based on it.

## Honest accounting vs. the README

`README.md` describes this as "one new file + one import line." The precise count is **one new file + two small mechanical edits** — the second edit being the `FieldType`/`FieldConfig` union membership in `src/types/field.ts`, which TypeScript's discriminated-union model makes unavoidable (there's no way to add a case to a closed union from a different file). Everything downstream of that — all 6+ consumers evaluated during this review (palette, add-handler, config host, renderer, conditions/calculations/visibility engines, PDF export) — is genuinely free, confirmed by reading each one: none contains a switch or if-chain over field type outside the registry itself.
