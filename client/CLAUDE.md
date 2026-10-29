# CLAUDE.md — Frontend Quick Reference

This file supplements the root `CLAUDE.md` and `client/DESIGN.md` with frontend-specific conventions for the `client/` directory.

---

## API layer (`client/api/`)

- Endpoints are defined in `api/api.ts` (main API) and `api/apiMeteo.ts` (weather); hooks are `API.use<EndpointName>Query/Mutation()`. Request/response types are in `api/types/`, models in `api/models/` (import via `import { ApiModel } from '@/api'`).
- `ApiModel.Event`'s `registered`/`bookedId`/`bookingStatus`/`hasReviewed` are viewer-scoped: present on `eventGetList`/`eventGetItem`/`eventGetUpcoming` only for an authenticated request, omitted for a guest.
- `ApiModel.Permission` mirrors the backend enum; read it only through `hasPermission()`/`hasAnyPermission()` (`client/utils/permissions.ts`).

Components live in `components/common/` (shared), `components/pages/<page>/` (page-specific) and `components/ui/` (primitives) — see `client/DESIGN.md` for which to reach for.

---

## Mandatory Coding Conventions

Props as `interface`, Russian `t()` fallbacks, both locale files, kit components over native HTML — see the root `CLAUDE.md`. In addition:

### Split non-JSX logic out of the component file

Each component lives in `component-name/ComponentName.tsx`. When that file accumulates non-JSX logic above/outside the component, pull it into sibling files in the same directory — the goal is a `.tsx` file that reads mostly as markup and wiring, not helper code:

| What                                                                             | Goes to        |
| -------------------------------------------------------------------------------- | -------------- |
| Pure helper functions (formatters, parsers, calculators, converters, validators) | `utils.ts`     |
| Grouped constants — alias/lookup maps, config objects, options lists             | `constants.ts` |
| Validation schema (e.g. `zod`)                                                   | `schema.ts`    |

Keep in the `.tsx` file: the component itself, its props `interface`, small component-local types, and any single trivial one-off constant not worth a whole file. Only split out a file when there's enough there to justify it — don't create an empty-feeling `utils.ts` for one two-line helper. Existing examples: `client/components/pages/stargazing/event-item-data/` (`utils.ts`), `client/components/pages/stargazing/event-form/` (`utils.ts` + `constants.ts` + `schema.ts`).

### RTK Query error shape

`baseQueryWithErrorTransform` in `client/api/api.ts` unwraps the raw `FetchBaseQueryError.data` into the error itself (restoring the transport-level HTTP `status`, which would otherwise be lost), so by the time an error reaches a component (via `.unwrap()` rejection or a mutation hook's `error` field), its shape is already flat — matching `ApiType.ResError`:

```ts
{
    status?: number,
    message: string,
    errors?: Record<string, string>
}
```

`message` is always present — it's the text for a generic `<Message type="error">` block. `errors` is present only when the failure is tied to specific form fields (validation), keyed by field name — pass `fieldErrors.someField` to that `Input`'s `error` prop.

Always read `error.message`/`error.errors`, not `error.data.messages` — there is no `.data` wrapper, and the old `messages`/generic-`'error'`-key convention no longer exists.

```ts
// Correct
const { message, fieldErrors } = useApiFormError(error) // client/hooks/useApiFormError.ts

// Wrong
const msg = (error as { data?: { messages?: Record<string, string> } })?.data?.messages?.error
```

Prefer the shared `useApiFormError(error)` hook (`client/hooks/useApiFormError.ts`, built on `getErrorMessage`/`getFieldErrors` from `client/utils/errors.ts`) over inlining `error.message`/`error.errors` parsing in new code, so error-shape fixes only need to happen in one place. Every form that submits to a mutation should use it rather than re-implementing its own parsing.

---

## Verification Checklist

Run all four after any change — CI will catch failures, but run locally first:

```bash
yarn eslint:fix
yarn prettier:fix
yarn test
yarn build
```

Don't run `yarn build` while `yarn dev` is running — they share `client/.next` and the build corrupts the dev server.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
