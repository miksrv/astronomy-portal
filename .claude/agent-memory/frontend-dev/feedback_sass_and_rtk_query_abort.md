---
name: sass-indented-syntax-and-rtk-query-abort
description: Two build-breaking/non-obvious gotchas found 2026-08-14 — .sass indented syntax can't do multi-line comma-continued property values; RTK Query mutation triggers support .abort() and resolve (not reject) with an AbortError-shaped error
type: feedback
---

**`.sass` files in this project use the indented syntax (not `.scss`), which does not support a multi-line comma-continued property value.** Writing
```sass
transition:
    background-color 0.15s ease,
    color 0.15s ease
```
breaks the Turbopack/dart-sass build with `Error: expected ":"` pointing at the second line. Keep multi-value properties like `transition`/`background` (multiple layers) on a single line: `transition: background-color 0.15s ease, color 0.15s ease`. Prettier's sass formatter did not flag or fix this - it only surfaced at `yarn build` time, not `yarn eslint:fix`/`yarn prettier:fix`/`yarn test`. Worth a real build (not just lint+test) before calling a sass change done.

**RTK Query mutation trigger promises never reject - they always resolve to `{data}` or `{error}`, including when aborted.** Calling `.abort()` on the object returned by a mutation trigger (`const req = someMutation(arg)`) aborts the underlying request; the awaited `req` then resolves to `{ error: { name: 'AbortError', message: 'Aborted' } }` - not routed through this project's `baseQueryWithErrorTransform` (which only reshapes the base query's own error branch), and not a promise rejection. Detect it with `(error as { name?: string })?.name === 'AbortError'`, not `getErrorMessage()` (which expects the `{messages: {...}}` shape and returns `undefined` for an abort error). Used in `client/components/pages/stargazing/event-photo-upload-dialog/EventPhotoUploadDialog.tsx` for the upload-queue cancel button.
