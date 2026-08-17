---
name: project_stack
description: Technology stack, framework versions, key architectural decisions, and post-audit patterns for the astronomy portal backend
type: project
---

CodeIgniter 4.6 REST API backend, PHP 8.2, MySQL/MariaDB. Located at `server/`.

**Key dependencies:**
- `firebase/php-jwt ^6.10` — JWT auth (HS256)
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

**Web Push system (FEAT-13, 2026-08-16):** Second announcement channel, deliberately mirrors the FEAT-1 mailing system 1-in-1 but keyed by *subscription* (device/browser) not *user* — one user can have 0..N `push_subscriptions` rows (unique `endpoint`; `PushSubscriptionsModel::upsertByEndpoint()` refreshes-in-place on re-subscribe rather than duplicating). Tables: `push_subscriptions`, `push_notifications` (mirrors `mailings`: draft/sending/completed/paused, no `canceled` — out of scope), `push_notification_deliveries` (mirrors `mailing_emails`: queued/sent/error/rejected — one row per (notification, subscription) pair, so a 2-device user gets 2 rows per campaign). New `Permission::PUSH_MANAGE` gates all `/push-notifications*` admin endpoints; user-facing `POST/DELETE /push/subscribe` + `GET /push/vapid-key` only need `isAuth` (opt-in is independent of the newsletter `subscribe_newsletter` setting — a user can have one, both, or neither). `WebPushLibrary` wraps `minishlink/web-push` v11 (`Minishlink\WebPush\WebPush::sendOneNotification()`, `MessageSentReport::isSuccess()`/`isSubscriptionExpired()` — the last one already checks for 404/410, no need to inspect the status code manually); VAPID keys live in `Config\Push` (env vars `push.vapidPublicKey/PrivateKey/Subject`) — regenerating them invalidates every existing subscription, one-time setup not a rotation. Cron command `php spark system:send-push` drains `push_notification_deliveries` (batch 50, no rate-limit unlike email — push has no SMTP-style provider reputation limit) and hard-deletes the `push_subscriptions` row on `WebPushExpiredSubscriptionException` (push_subscriptions has no soft-deletes). `UsersModel::getUsersList()` (backs `/admin/users`) now joins `push_subscriptions` alongside `events_users` — both joins are one-to-many fan-outs, so both aggregate COUNTs must use `COUNT(DISTINCT ...)` or the second join inflates the first's count via cartesian product (this bit an early version of `eventsCount` when the push join was added — watch for the same trap if a third one-to-many join is ever added here).

**Model inheritance rule:** All models must extend `ApplicationBaseModel`, not `CodeIgniter\Model` directly. `ApplicationBaseModel` provides `generateId` (beforeInsert) and `prepareOutput` (afterFind / hiddenFields).

**Entity datetime wire format — two distinct conventions, easy to conflate:** CI4's `Entity::__get()` mutates any attribute listed in `$dates` into a `Time` object *unconditionally*, bypassing `$casts` entirely (dates-check happens in an `if/elseif` before the cast branch — see `vendor/codeigniter4/framework/system/Entity/Entity.php`). A `Time` object (extends `DateTimeImmutable`, no custom `jsonSerialize()`) serializes over the wire as `{date, timezone_type, timezone}`, NOT a plain string. This codebase uses that shape *deliberately* for most entity datetime fields (`created_at`/`updated_at`/`deleted_at`, `events.date`/`endDate`/`registrationStart`/`registrationEnd`, etc.) — the frontend has a shared `ApiType.DateTime = {date, timezone_type, timezone}` type and unwraps `.date` where needed (e.g. `event.endDate.date` in `EventInfoPanel.tsx`). But some fields deliberately opt OUT of this and stay a plain string: they are cast `'?string'` (not `'?datetime'`) AND excluded from `$dates` — e.g. `UserEntity::birthday`, `EventPhotoEntity::taken_at`. Before adding a new datetime-ish field to an entity, check how the *frontend model* types it (`DateTime` vs plain `string`) in `client/api/models/*.ts` — that dictates whether the field belongs in `$dates` (→ `DateTime` object) or should be `'?string'`-cast and left out of `$dates` (→ plain string). Getting this wrong silently breaks the wire contract without any test catching it (PHPUnit tests only check entity-internal behavior, not the frontend's TS type expectations).

**Adding an index to an existing table in a migration:** Forge's `createTable()`-time `addKey()` doesn't apply retroactively to an already-created table. The established pattern here (see `AddEventUserPaymentColumns`, `AddEventPhotosGroupingFields`) is: `$this->forge->addKey('col', false, false, 'idx_name'); $this->forge->processIndexes('table_name');` in `up()`, and `$this->forge->dropKey('table_name', 'idx_name')` in `down()`. Works for both MySQLi and SQLite (unlike raw generated-column ALTERs, which this codebase gates behind `$this->db->DBDriver !== 'MySQLi'` — see `AddEventUsersActiveBookingUniqueKey`).

**EventsModel ID:** `allowCallbacks = true` but `beforeInsert = []` — ID is assigned manually in controller via `$event->id = uniqid()` before `model->save()`. This is intentional because the event upload directory must be created using the ID before the DB insert. Do NOT add `generateId` to EventsModel.

**Why:** This is a personal astronomy observatory portal with event booking, astrophoto gallery, FITS file metadata ingestion, and live relay/camera control.

**How to apply:** When suggesting changes, assume MySQL, CodeIgniter conventions (model callbacks, entity datamaps), and that the front-end expects camelCase-to-snake_case entity datamap translations.
