---
name: project_error_contract_migration_stale_tests
description: RTK Query error contract was migrated to {status, message, errors} but some test files still mock the old {messages:{field:...}} shape, causing unrelated test failures
metadata:
    type: project
---

The API error contract was migrated (`client/utils/errors.ts`, `client/hooks/useApiFormError.ts`,
`ApiType.ResError` in `client/api/types/index.ts`) from an old `{ messages: { field: '...' } }` /
`error.data.messages` shape to the new flat `{ status?, message, errors? }` shape (see
"RTK Query error shape" in `client/CLAUDE.md`).

At least two test files were not updated to match and fail as a result, unrelated to any specific
feature change:

- `client/components/pages/stargazing/event-upcoming/EventUpcoming.test.tsx` (mocks
  `error: { messages: { error: '...' } }` for the delete-event flow)
- `client/components/pages/stargazing/event-form/EventForm.test.tsx` (mocks
  `error={{ messages: { title: '...' } }}` for field-level validation)

`client/components/pages/stargazing/event-upcoming/event-booking-form/EventBookingForm.test.tsx`
had the same stale `{ messages: { error: '...' } }` mock and has already been fixed (updated to
`{ message: '...' }`) as part of migrating `EventBookingForm.tsx` itself to `useApiFormError` — so
that one suite is not in the list above anymore.

**Why:** the components under test now read `error.message`/`error.errors` via `getErrorMessage`/
`getFieldErrors`, so the old mock shape resolves to `undefined` and the component falls back to
its default text instead of the mocked message — the assertion then can't find the expected text.

**How to apply:** if asked to touch `EventUpcoming`, `EventDeleteDialog`, or `EventForm` (or their
tests), expect these two suites to already be red before your change. Confirm with `git stash` /
`git diff` that the failure predates your edit before spending time on it — it's a leftover from
the contract migration, not a regression you introduced. Fixing means updating the mocked `error`
value in the test to `{ message: '...' }` (or `{ message: '...', errors: { field: '...' } }` for
field-level cases), not touching the component.
