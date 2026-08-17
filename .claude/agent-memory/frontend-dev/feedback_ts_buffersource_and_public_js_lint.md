---
name: feedback_ts_buffersource_and_public_js_lint
description: Two build-breaking gotchas found 2026-08-16 adding Web Push - Uint8Array.from() fails BufferSource typing under this TS version; new vanilla-JS files under public/ need an eslint.config.mjs ignore entry
type: feedback
---

**`Uint8Array.from(...)` is typed as `Uint8Array<ArrayBufferLike>`, which this project's TypeScript version no longer accepts where a `BufferSource`/`ArrayBufferView<ArrayBuffer>` is required** (e.g. `PushSubscriptionOptionsInit.applicationServerKey`). Error looks like: `Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'string | BufferSource | null | undefined'` / `SharedArrayBuffer is missing ... resizable, resize, detached, ...`. Fix: construct explicitly with `new Uint8Array(length)` and fill by index in a loop instead of `.from()`/spread - that infers the concrete `Uint8Array<ArrayBuffer>` the DOM lib now demands. Only surfaced at `yarn build` (`tsc`), not `eslint:fix`/`test`. Used in `client/utils/push.ts` (`urlBase64ToUint8Array`).

**Any new plain (non-TS) `.js` file placed under `client/public/` needs an explicit ignore entry in `client/eslint.config.mjs`**, or eslint tries to type-check it against `tsconfig.json` and fails with a "TSConfig does not include this file" parsing error. The config already ignores `d3.min.js`/`d3.geo.projection.min.js`/`celestial.min.js` (vanilla star-map libs) under a `// JS Project Files` comment - added `**/public/sw.js` (the Web Push service worker) there the same way. Any future static JS dropped into `public/` (another service worker, a third-party vendor script, etc.) will need the same treatment.

**Why:** Both only failed at `yarn build`/full lint, not at file-write time - worth a real `yarn eslint:fix` + `yarn build` pass before declaring a change with new `public/*.js` files or `Uint8Array` usage done, matching the existing `.sass` build-only-failure lesson in [[sass-indented-syntax-and-rtk-query-abort]].

**How to apply:** When adding a service worker, web worker, or any vendor script as a static asset in `client/public/`, add its path to the `ignores` array in `eslint.config.mjs` up front. When constructing a `Uint8Array` that will be passed to a DOM API typed as `BufferSource`, prefer `new Uint8Array(n)` + index assignment over `.from()`/`Array.from()`/spread-based construction.
