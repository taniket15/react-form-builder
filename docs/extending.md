# Extending & Maintaining

Common changes and where to make them. See `architecture.md` for how the pieces fit together.

## Add a field type

See `adding-a-field-type.md` for the full walkthrough. Short version: one new file in `src/fields/`, plus two small edits (add the type to `src/types/field.ts`, add one import line in `src/fields/index.ts`). Everything else — palette, config panel, Fill rendering, PDF export — picks it up automatically.

## Add a condition operator

1. Add the operator to `ConditionOperator` in `src/types/condition.ts`:
   ```ts
   export type ConditionOperator =
     | 'equals'
     | 'contains'
     | 'yourNewOperator'   // add here
   ```
2. In the relevant field's file (e.g. `NumberField.tsx`), list it and handle it:
   ```ts
   conditionOperators: [
     { operator: 'equals', label: 'equals' },
     { operator: 'yourNewOperator', label: 'your label' },
   ],
   evaluateCondition: (operator, targetValue, compareValue) => {
     if (operator === 'yourNewOperator') return /* your comparison */
     // ...existing cases
   }
   ```
3. If it needs a new kind of comparison input (a range, a checklist, etc.), add a case in `ConditionsEditor.tsx`'s `ValueEditor`.

A forgotten case here fails silently rather than at build time — test it by hand.

## Add a calculation aggregation

1. Add it to the aggregation union in `src/types/field.ts`:
   ```ts
   aggregation: 'sum' | 'average' | 'min' | 'max' | 'median'   // add here
   ```
2. Add a case in `computeCalculations` (`src/engine/calculations.ts`):
   ```ts
   case 'median':
     value = /* your math */
     break
   ```
3. Add it to the aggregation dropdown in `Calculation.tsx`.
4. Add a test in `calculations.test.ts` — include a case with an empty source field.

## Add a localStorage migration

`schemaVersion` (`src/storage/localStorage.ts`) exists for this but isn't used yet — nothing has needed migrating so far. When the stored data shape changes: bump the version, and in `loadTemplates`/`loadResponses`, convert old data into the new shape before returning it.

## A note on the type system

TypeScript catches a lot here (a missing field type, a missing calculation aggregation), but not everything — it won't catch a missed condition operator case. Run `npm run build` and `npm run test`, but for conditional logic, always verify by hand too.
