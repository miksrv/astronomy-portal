---
name: package-upgrade-constraints
description: Known package version history/constraints in the astronomy-portal client — check current package.json before trusting any pin below
type: feedback
---

**Historical, now resolved (verified 2026-08-14):** `eslint` was previously pinned to `^9` because `eslint-plugin-react@7.37.5` crashed on ESLint v10, and `next-seo` was pinned to `^6` because v7 was a rewrite. As of 2026-08-14 the project is already on `eslint@^10.8.1` (with `eslint-plugin-react@^7.37.5` still, no crash observed) and `next-seo@^7.3.0`, and `yarn eslint:fix`/`yarn build` pass clean. **Do not re-apply the old v9/v6 pins** — the blockers that justified them no longer reproduce. If a future upgrade attempt on either package fails again, re-add a constraint here with the new failure mode and date.

**Why this matters:** a memory recorded once is easy to keep following even after the underlying repo state moves past it — always check `client/package.json` for the installed version before assuming a pin from memory still applies.

## Resolution override (still in effect — verify before relying on it)

A `resolutions` entry for `@typescript-eslint/utils: "^8.59.0"` is set in `package.json` to force the latest version everywhere. This was needed because `eslint-plugin-jest` bundled an older `@typescript-eslint/utils@8.34.1` that was incompatible with ESLint 9 flat config changes.

## TypeScript 6.0 tsconfig changes (still in effect)

After upgrading to TypeScript 6.0, these changes were required in `tsconfig.json` (confirmed still present 2026-08-14):
- `target: "es5"` → `"es2017"` (es5 deprecated in TS6)
- `"types": ["node", "jest"]` (TS6 defaults types to `[]` instead of auto-including all @types packages)
