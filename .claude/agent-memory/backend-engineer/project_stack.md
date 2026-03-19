---
name: project_stack
description: Technology stack, framework versions, and key architectural decisions for the astronomy portal backend
type: project
---

CodeIgniter 4.6 REST API backend, PHP 8.2, MySQL. Located at `server/`.

**Key dependencies:**
- `firebase/php-jwt ^6.10` — JWT auth (HS256)
- `longman/telegram-bot ^0.83.1` — Telegram notifications on event booking
- PHPUnit 11.5 (dev)

**Auth pattern:** Stateless JWT in `Authorization` header. `SessionLibrary` reads and validates the token on every request constructor. Token payload contains only `email`; `UsersModel::findUserByEmailAddress()` is called per request to hydrate the full user. Three OAuth providers: Google, Yandex, VK.

**ID strategy:** `uniqid()` used for all primary keys (users, events, photos, event_users). Not collision-safe under concurrent load.

**Locale pattern:** `LocaleLibrary` constructed as a side-effect object in controller constructors; reads `Locale` header, sets request locale. Supported locales: `en`, `ru`. Default: `ru`.

**Upload directories (constants in `app/Config/Constants.php`):**
- `UPLOAD_PHOTOS` = `public/astrophotos/`
- `UPLOAD_EVENTS` = `public/stargazing/`
- `UPLOAD_USERS` = `public/users/`
- `UPLOAD_STAR_MAPS` = `public/starmaps/`

**Why:** This is a personal astronomy observatory portal with event booking, astrophoto gallery, FITS file metadata ingestion, and live relay/camera control.

**How to apply:** When suggesting changes, assume MySQL, CodeIgniter conventions (model callbacks, entity datamaps), and that the front-end expects camelCase-to-snake_case entity datamap translations.
