---
name: project_error_contract_migration
description: Backend is mid-migration from CI4 ResponseTrait fail*() to BaseApiController respond*() with an explicit {message, errors?} error contract
type: project
---

The backend is being migrated controller-by-controller (likely by multiple parallel agents/sessions) from ad-hoc `ResourceController`/`ResponseTrait` `fail()/failValidationErrors()/failNotFound()/...` calls to a new, explicit JSON error contract defined in `App\Controllers\BaseApiController` (extends `ResourceController`):

```
{ "message": "..." }
{ "message": "...", "errors": { "fieldName": "...", ... } }   // only when tied to specific form fields
```

HTTP status is the sole carrier of error semantics: 400 invalid input/validation, 401 unauthenticated, 403 authenticated-but-forbidden, 404 not found, 409 conflict/invalid-due-to-current-state, 500 unexpected server error. `App\Libraries\ApiExceptionHandler` normalizes uncaught exceptions/router 404s to the same shape, so this holds even outside controllers.

`Relay.php` was migrated first as the reference example. As of 2026-08-19, `Events.php` (the largest/most complex controller — booking, cancellation, check-in, Alfa-Bank payment flow, photo uploads) is fully migrated to `BaseApiController`.

**Reclassification heuristic used for ad-hoc `failValidationErrors(['error' => lang(...)])` call sites** (these were abusing the old `messages` bucket for what were really general or state-based errors, not real field validation):
- Tied unambiguously to one real form field (e.g. `date`, `endDate`, `registrationStart/End`, `requiresRegistration`, a file input name like `upload`/`photo`) → `respondValidationErrors(['fieldName' => msg])`, 400. When two fields are jointly invalid (e.g. a registration window check spanning start+end), key the same message under both field names rather than inventing a fake `error` key.
- "Cannot proceed because of current state" (already registered, already cancelled, no tickets left, registration window closed, no payment linked to refund/verify, payment not in a refundable state) → `respondConflict()`, 409.
- Truly missing resource (event/booking/payment doesn't exist) → `respondNotFound()`, 404 — even if the original code called `failValidationErrors`/`fail()` for it. Reclassify by *meaning*, not by which `fail*` method happened to be used originally.
- Generic, not-field-tied invalid input (bad QR code, invalid callback signature, missing/empty path id) → `respondError($msg, 400)`.
- A downstream gateway (Alfa-Bank refund) call failing → mapped to `respondServerError()` (500), not a 502 — the contract only has the 6 statuses above, no bad-gateway status.

**Bug found and fixed in passing**: `Events.php` referenced a non-existent lang key `App.validationError` in several places (empty/missing `id` path param checks) — `App.php` only ever had `validationFailed`. Fixed to reference the real key. `App.php`/`General.php` are explicitly off-limits for controller-migration agents to edit (owned by whoever runs the migration, to avoid merge conflicts across parallel agents) — only reference existing keys there, never add/edit them from a controller-migration task.

**How to apply**: When migrating another controller's `fail*()` calls, read `BaseApiController` and `Relay.php` first, then apply the same heuristic above rather than a mechanical 1:1 status mapping. Check `server/app/Language/{en,ru}/<Controller>.php` for existing keys before assuming a new one is needed — most business-error strings already exist from the pre-migration code.
