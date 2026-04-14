---
name: project_stack
description: Technology stack, framework versions, key architectural decisions, and post-audit patterns for the astronomy portal backend
type: project
---

CodeIgniter 4.6 REST API backend, PHP 8.2, MySQL/MariaDB. Located at `server/`.

**Key dependencies:**
- `firebase/php-jwt ^6.10` — JWT auth (HS256)
- `longman/telegram-bot ^0.83.1` — Telegram notifications on event booking
- PHPUnit 11.5 (dev)

**Auth pattern:** Stateless JWT in `Authorization` header. `SessionLibrary` reads and validates the token on every request constructor. Token payload contains only `email`; `UsersModel::findUserByEmailAddress()` is called per request to hydrate the full user. Three OAuth providers: Google, Yandex, VK. `Services::getSecretKey()` now throws RuntimeException if `auth.token.secret` env var is empty.

**Auth guard order (post-audit):** In every controller method: check `!$session->isAuth` → `failUnauthorized()`, then check role → `failForbidden()`, THEN validate input, THEN query DB. Never validate before auth.

**ID strategy:** `uniqid()` used for all primary keys (users, events, photos, event_users). Not collision-safe under concurrent load.

**Locale pattern:** `LocaleLibrary::init()` (static method) called in controller constructors; reads `Locale` header, sets request locale. Supported locales: `en`, `ru`. Default: `ru`. Do NOT use `new LocaleLibrary()` — use `LocaleLibrary::init()`.

**Error messages:** Use `lang('App.accessDenied')`, `lang('App.objectNotFound')`, etc. Language files at `app/Language/en/App.php` and `app/Language/ru/App.php`.

**CORS:** Built-in CI4 Cors filter (Config\Cors). Allowed origins: `http://localhost:3000`, `https://miksoft.pro`, `https://www.miksoft.pro`. The old custom CorsFilter.php is a stub.

**Caching:** CI4 cache service. Keys: `categories_list_{locale}` (5 min), `equipment_list` (5 min), `objects_list_{locale}` (5 min).

**Activity debounce:** `UsersModel::updateUserActivity()` skips the DB write if last `activity_at` was less than 5 minutes ago.

**CLI commands:** `php spark fits:recalculate` — recalculates FITS filter aggregates. HTTP endpoint removed.

**Upload directories (constants in `app/Config/Constants.php`):**
- `UPLOAD_PHOTOS` = `public/astrophotos/`
- `UPLOAD_EVENTS` = `public/stargazing/`
- `UPLOAD_USERS` = `public/users/`
- `UPLOAD_STAR_MAPS` = `public/starmaps/`

**insertBatch caveat:** `insertBatch()` does NOT trigger `beforeInsert` callbacks (including `generateId`) and does NOT auto-populate `created_at`/`updated_at` from `useTimestamps`. Always pre-generate IDs with `uniqid()` and include timestamp columns manually in the batch array.

**Entity ID caveat:** The `generateId` beforeInsert callback writes to `$data['data']['id']` (the DB insert array), but does NOT write back to the entity object. Set `$entity->id = uniqid()` manually before calling `model->save()` when you need to reference the ID after save.

**SMTP / email:** EmailLibrary at `server/app/Libraries/EmailLibrary.php`. Config from `smtp.*` env vars. Uses `sendWithAttachment()` for inline image embed via CID placeholder `cid:COVER_IMAGE_CID`. Call `clear(true)` + `initialize()` before each send for sequential safety.

**Newsletter system (FEAT-1, 2026-04-13):** Tables `mailings`, `mailing_emails`, `mailing_unsubscribes`. JSON column `users.settings` added. Cron command at `php spark system:send-email`. Unsubscribe gate: `users.settings.subscribe_newsletter === false` excludes users. NULL or missing key = subscribed.

**TelegramLibrary:** `server/app/Libraries/TelegramLibrary.php` — thin wrapper around `longman/telegram-bot`. Use `(new TelegramLibrary())->sendMessage($html)` instead of inline `new Telegram(...)` / `Request::sendMessage(...)` in controllers. Reads `app.telegramBotKey` and `app.telegramChatID` env vars.

**Model inheritance rule:** All models must extend `ApplicationBaseModel`, not `CodeIgniter\Model` directly. `ApplicationBaseModel` provides `generateId` (beforeInsert) and `prepareOutput` (afterFind / hiddenFields).

**EventsModel ID:** `allowCallbacks = true` but `beforeInsert = []` — ID is assigned manually in controller via `$event->id = uniqid()` before `model->save()`. This is intentional because the event upload directory must be created using the ID before the DB insert. Do NOT add `generateId` to EventsModel.

**Why:** This is a personal astronomy observatory portal with event booking, astrophoto gallery, FITS file metadata ingestion, and live relay/camera control.

**How to apply:** When suggesting changes, assume MySQL, CodeIgniter conventions (model callbacks, entity datamaps), and that the front-end expects camelCase-to-snake_case entity datamap translations.
