---
name: feedback_rhf_zod_form_conventions
description: react-hook-form + zod conventions for simple-react-ui-kit forms — Controller wrapping, NaN sentinel, superRefine, no onChange+isValid gating, useFieldArray, async-resolver effect deps, jest --runInBand
type: feedback
---

Every form uses react-hook-form + zod (`@hookform/resolvers/zod`) with `useApiFormError` → `useSyncApiFieldErrors` for server field errors. Reference: `client/components/common/login-form/LoginForm.tsx`.

**Why:** the kit's `Input`/`TextArea`/`Select`/`Checkbox` are not `forwardRef`, so `register()` doesn't work, and several RHF defaults produce silent bad UX here.

**How to apply:**
- Wrap every field in `<Controller>`; spreading `{...field}` onto a kit component logs a harmless ref warning — that is the accepted pattern.
- Multi-select `Select`: `value={field.value}`, `onSelect={(s) => field.onChange(s?.map(({ key }) => key) ?? [])}`.
- Required numeric `Input`: keep the field typed `number`, use `NaN` as "empty" (`parseFloat('')`), render `Number.isNaN(v) ? '' : v`; zod v4 `z.number({ error })` rejects NaN with that message.
- To keep "required" winning over "too short", use one `.superRefine()` with if/else-if instead of chained `.min()`/`.max()`.
- **Never gate submit on `mode: 'onChange'` + `isValid`** for a form with a required field and no default: the button stays disabled with no visible error (bit `AstroObjectForm`/`AstroPhotoForm`). Gate only on `isSubmitting`/`isLoading`; the first submit shows every error. Single-field `LoginForm` is the only exception.
- Dynamic sub-object lists: `useFieldArray`, converting to/from the API shape only in `reset()` and the submit handler (`AstroPhotoForm` `filters`). `z.enum()` from `Object.keys()` needs a non-empty tuple cast.
- `handleSubmit` is always at least one microtask later than a plain async handler: a `useEffect` reacting to a mutation flag must also list any local state set inside `onValid` (e.g. `submitted`) in its deps (`EventBookingForm`).
- `jest.clearAllMocks()` does not reset `.mockResolvedValue()` — use `mockReset().mockResolvedValue(default)` in `beforeEach` for shared mutation mocks.
- Scattered `waitFor` timeouts in untouched suites on a full run are CPU contention — re-run with `--runInBand` before debugging.
