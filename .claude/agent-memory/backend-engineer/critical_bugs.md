---
name: critical_bugs
description: Post-audit status of critical and high bugs from 2026-03-19 — all listed bugs are now fixed
type: project
---

All bugs from the 2026-03-19 audit (tasks 1.1–1.12, 2.1–2.13, 3.2–3.6, 4.1–4.7, 5.1) were fixed on 2026-03-24.

**Previously critical — now fixed:**
- `getLocalizedString()` `||` vs `??` bug — fixed in `locale_helper.php`
- `Files::updates()` wrong class names — fixed to use FQCN `\App\Models\ObjectsModel` and `\App\Models\ObjectFitsFilesModel`
- `GET /system/recalculate/fits` unauthenticated endpoint — removed; use `php spark fits:recalculate`
- CORS wildcard — replaced with CI4 built-in Cors filter with explicit allowlist
- EventsModel datetime format `H:m:s` → `H:i:s` — fixed
- Missing `return` before `failValidationErrors()` in booking/cancel — fixed
- `$eventData->registered` undefined property — initialized to `false` before use
- `Photos::download()` null dereference — null check moved before property access
- `Photos::list()` returning `$photosData` instead of `$result` — fixed
- `JSON_LENGTH` on integer column — replaced with `SUM`

**How to apply:** These are resolved. If you see these patterns again in new code, treat them as known anti-patterns for this codebase.
