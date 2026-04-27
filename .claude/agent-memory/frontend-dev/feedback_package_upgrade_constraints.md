---
name: package-upgrade-constraints
description: Known package version constraints and reasons for not upgrading to latest in the astronomy-portal client
type: feedback
---

Do not upgrade ESLint past v9 until `eslint-plugin-react` and `eslint-plugin-import` add ESLint v10 support. As of 2026-04-27, `eslint-plugin-react@7.37.5` only supports up to ESLint ^9.7 and crashes on v10 (`contextOrFilename.getFilename` removed).

Do not upgrade `next-seo` past v6. v7 is a complete API rewrite — `<NextSeo>` component replaced with `generateNextSeo()` function, import paths changed to `next-seo/pages`. The release notes explicitly say "this is not a drop-in replacement."

**Why:** Attempted these upgrades and they caused hard crashes requiring rollback.

**How to apply:** When running `yarn up '*'` or similar, pin these packages: `eslint@^9`, `@eslint/js@^9`, `next-seo@^6`. If a future update attempt for eslint-plugin-react adds ESLint v10 peer support, that constraint can be lifted.

## Resolution override

A `resolutions` entry for `@typescript-eslint/utils: "^8.59.0"` is set in `package.json` to force the latest version everywhere. This was needed because `eslint-plugin-jest` bundled an older `@typescript-eslint/utils@8.34.1` that was incompatible with ESLint 9 flat config changes.

## TypeScript 6.0 tsconfig changes

After upgrading to TypeScript 6.0, these changes were required in `tsconfig.json`:
- `target: "es5"` → `"es2017"` (es5 deprecated in TS6)
- Added `"types": ["node", "jest"]` (TS6 defaults types to `[]` instead of auto-including all @types packages)
