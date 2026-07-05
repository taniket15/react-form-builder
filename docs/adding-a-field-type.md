# Adding a New Field Type

Every field type is one file implementing a common interface, registered once. Everything else — the Builder palette, config panel, Fill Mode, conditions, PDF export — reads from that registry, so adding a new type barely touches existing files:

```
your new file  →  registerField(...)  →  registry
                                            ↑
        Builder palette, config panel, Fill Mode, PDF export
        all read from the registry — none of them change
```

## Files you touch

1. **`src/types/field.ts`** — add the type name to `FieldType`, define its config interface (extend `BaseConfig`), add it to the `FieldConfig` union.
2. **`src/fields/YourType.tsx`** (new file) — implement the field.
3. **`src/fields/index.ts`** — add one import line.

That's it. No other file needs to change.

## What the field file needs

```ts
export const yourTypeDefinition: FieldDefinition<YourTypeConfig, Value> = {
  type: 'yourType',
  label: 'Your Type',
  icon: '❓',
  createDefaultConfig,   // config when the field is first added
  ConfigPanel,           // Builder's right-panel editor
  FillField,             // how it renders in Fill Mode
  getInitialValue,       // value when a new form opens
  validate,              // return an error string, or null
}

registerField(yourTypeDefinition)
```

Optional hooks — add only if they apply:

| Hook | Add it if... |
|---|---|
| `conditionOperators` + `evaluateCondition` | Other fields should be able to target this one in a condition. Skip for types that shouldn't be targetable (like Section Header). |
| `formatForDisplay` | The value should appear as a label/value row in the submitted-response view and PDF. |
| `renderForPdf` | The field has no value (like Section Header) and should render as a heading instead of a row. |

Reuse `LabelRequiredFields` (and `DecimalPlacesField` if numeric) from `configPanelFields.tsx` for the common config-panel fields instead of rewriting them. `SingleLineText.tsx` is the simplest existing field to copy the overall shape from.

## What you get for free

Once the field is registered: it appears in the palette, can be added and configured, renders in Fill Mode, validates on submit, can be targeted by (or use) conditions if you added the operators, and shows up correctly in the PDF and response preview. None of that needs separate wiring.

## Verification

- `npm run build` — catches a missing `FieldConfig` entry immediately.
- `npm run test`
- Manually: add the field in Builder, configure it, fill it in Fill Mode, submit, check the PDF. If it's a condition target, confirm another field can reference it.
