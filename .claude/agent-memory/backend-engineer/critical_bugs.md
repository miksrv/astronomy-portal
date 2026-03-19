---
name: critical_bugs
description: Critical and high-severity bugs found in the audit that must be fixed before production deployment
type: project
---

The following bugs were found in the 2026-03-19 full audit. Most are not yet fixed.

**CRITICAL — Data corruption:**
- `app/Helpers/locale_helper.php:15-16` — `getLocalizedString()` uses `||` (boolean OR) instead of `??` (null coalesce) in fallback. Returns `false` instead of empty string. Every localized title/description in objects, categories, events can be `false` in JSON.
- `app/Controllers/Files.php:75-76` — `Files::updates()` references `ObjectModel` and `ObjectFitsFileModel` (both non-existent). Correct names: `ObjectsModel` and `ObjectFitsFilesModel`. The entire FITS ingestion endpoint is broken.

**CRITICAL — Security:**
- `app/Config/Routes.php:10` — `GET /system/recalculate/fits` has zero authentication. Triggers heavy DB recalculation for any anonymous caller.
- `app/Filters/CorsFilter.php:26` — `Access-Control-Allow-Origin: *` applied to all responses.

**HIGH — Logic bugs:**
- `app/Models/EventsModel.php:77` — datetime format `'Y-m-d H:m:s'` uses `m` (month) where it should be `i` (minutes). Upcoming event queries use wrong timestamps.
- `app/Controllers/Events.php:436-438` and `:537-539` — `failValidationErrors()` called without `return` in booking/cancel. Execution continues past the guard → null pointer on `$event->registration_start`.
- `app/Controllers/Events.php:94` — `$eventData->registered` accessed before being set (undefined property).
- `app/Controllers/Photos.php:127-133` — `$photoData->image_name` dereferenced before null check in `download()`.
- `app/Controllers/Photos.php:61-67` — `Photos::list()` builds `$result` with filter stats but returns original `$photosData` instead.
- `app/Models/EventsUsersModel.php:70,86` — `JSON_LENGTH(events_users.children)` used on an integer TINYINT column. Should be `SUM(events_users.children)`.

**How to apply:** When editing any of these files, fix these bugs as part of the work. Do not ship these files to production in their current state.
