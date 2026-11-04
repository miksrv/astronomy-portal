# server/CLAUDE.md

Backend-specific reference for the CodeIgniter 4 PHP API. For project-wide context, dev commands, and deployment see the root `CLAUDE.md`.

## API Routes (`app/Config/Routes.php`)

```
GET  /                              → API health info (inline closure)

GET  /camera/:id                    → Camera::show

GET  /statistic/telescope           → Statistic::telescope     (per observing night: local noon → noon, UTC+5; `?period=MM-YYYY`; cached 10 min; the FITS archive is read-only now, so the cache simply expires)

GET  /auth/me                       → Auth::me
GET  /auth/google                   → Auth::google              [rate-limited: auth_oauth, 15/300s]
GET  /auth/yandex                   → Auth::yandex              [rate-limited: auth_oauth, 15/300s]
GET  /auth/vk                       → Auth::vk                  [rate-limited: auth_oauth, 15/300s]
POST /auth/magic-link               → Auth::requestMagicLink    (passwordless email login; per-email/IP cooldown in MagicLinkTokensModel)
POST /auth/magic-link/verify        → Auth::verifyMagicLink
POST /auth/logout                   → Auth::logout              (clears users.session_token — revokes every token issued to this user, on any device)
PATCH /auth/profile                 → Auth::updateProfile

GET  /relay/list                    → Relay::list
GET  /relay/light                   → Relay::light              [rate-limited: relay_light, 6/300s] ⚠ no auth check — cooldown heuristic only
PUT  /relay/set                     → Relay::set

GET  /files/:path                   → Files::show

GET  /catalog/search                → Catalog::search          (public; `?q=` designation prefix — `M3`, `ngc 70` — or part of a common name, `&limit=` ≤ 25; exact designation first, then Messier, then brightest; each item has `objectName` when our `objects` row is linked) [rate-limited: catalog_search, 120/60s; cached 1 h]
GET  /catalog/:name                 → Catalog::show            (public; any designation → the OpenNGC object + all its `aliases`; 404 if unknown)

POST /observatory/agent/status      → Observatory::agentStatus (observatory agent only: `Authorization: Bearer <observatory.agentToken>` via `observatoryagent`; body = status snapshot + optional `events[]`; ≤ 32 KB) [rate-limited: observatory_agent, 10/60s]
GET  /observatory/status            → Observatory::status      (public; `{online, updatedAt, snapshot}` — online = last snapshot younger than 180 s; only the public sections, see `ObservatoryStatusModel::PUBLIC_SECTIONS`; cached 30 s)
GET  /observatory/events            → Observatory::events      (public; recent public events, `?limit=` ≤ 50; cached 60 s)

GET  /equipments                    → Equipment::list
GET  /categories                    → Categories::list

GET    /objects                     → Objects::list   (+ per object: `nights`/`firstNight`/`lastNight`, `photosCount`, `cover` = newest photo's file fields; cached 5 min, invalidated by object, photo and FITS writes)
GET    /objects/:name               → Objects::show   (+ `distance`, `magnitude`, `nights`/`firstNight`/`lastNight`, `optics` = the FITS optical train most frames share: focal length, aperture, pixel size, sensor size, binning, plate scale)
POST   /objects                     → Objects::create
PATCH  /objects/:name               → Objects::update
DELETE /objects/:name               → Objects::delete

GET    /photos                      → Photos::list
GET    /photos/:id/astrometry       → Photos::astrometry (public; the plate solve — centre, scale, rotation, WCS, annotations; 404 until solved; declared before GET /photos/:id)
POST   /photos/:id/astrometry       → Photos::solve      (photos.manage; one step of the solve — starts it when there is none, otherwise moves it along — and returns the row; a finished solve is returned as is unless the body carries `restart: true` (the editor's "Перерешать" button), so a late poll never re-uploads the picture; the editor's browser polls it every few seconds after an upload, so there is no cron; 503 without `astrometry.apiKey`)
GET    /photos/:id                  → Photos::show       (no side effects: the view counter moved to POST /photos/:id/view)
POST   /photos/:id/view             → Photos::view       (public; +1 view, 204; sent by the photo page once open [rate-limited: views, 60/60s])
POST   /photos                      → Photos::create
POST   /photos/:id/upload           → Photos::upload     (also resets the photo's plate solve to `pending`)
PATCH  /photos/:id                  → Photos::update
DELETE /photos/:id                  → Photos::delete

GET    /events                      → Events::list   (optional `?userId=` narrows to that user's own attended events — only honoured when it matches the caller's own session, otherwise silently ignored)
GET    /events/upcoming             → Events::upcoming
GET    /events/upcoming/registered  → Events::upcomingRegistered
GET    /events/media                → Events::media   (one chronological feed of both photos and videos; `mediaType`/`duration` per item)
GET    /events/:id/statistic        → Events::statistic
GET    /events/:id/registrations    → Events::registrations
GET    /events/:id                  → Events::show       (no side effects: the view counter moved to POST /events/:id/view)
POST   /events/:id/view             → Events::view       (public; +1 view, 204; sent by the event page once open [rate-limited: views, 60/60s])
GET    /events/members/:id          → Events::members (events.users privilege)
GET    /events/checkin/:id          → Events::checkin
GET    /events/ticket/:id           → Events::ticket
POST   /events                      → Events::create
PATCH  /events/:id                  → Events::update
DELETE /events/:id                  → Events::delete
POST   /events/:id/cover            → Events::cover
POST   /events/booking              → Events::booking          [rate-limited: events_booking, 5/300s]
POST   /events/cancel               → Events::cancel
POST   /events/payment/status       → Events::paymentStatus
GET|POST /events/payment/callback   → Events::paymentCallback   (Alfa-Bank server-to-server callback; HMAC-verified)
POST   /events/registrations/:id/verify-payment → Events::verifyRegistrationPayment
POST   /events/registrations/:id/refund → Events::refundRegistrationPayment (events.refund privilege — forced refund + cancellation)
POST   /events/media/init/:id       → Events::mediaInit      (opens a chunked upload session; returns `sessionId` + server-authoritative `chunkSize`)
POST   /events/media/chunk/:sessionId → Events::mediaChunk   (one chunk; idempotent per index, returns every index on disk)
POST   /events/media/finalize/:sessionId → Events::mediaFinalize (assembles chunks, runs the photo pipeline or stores the video + client poster, inserts the `events_media` row)
DELETE /events/media/:sessionId     → Events::mediaCancel    (declared before DELETE /events/:id)

GET    /mailings                    → Mailings::list
POST   /mailings                    → Mailings::create
POST   /mailings/unsubscribe        → Mailings::unsubscribe  (public, rate-limited, idempotent; declared before (:alphanum))
GET    /mailings/audiences          → Mailings::audiences    (mailings.manage privilege; declared before (:alphanum))
GET    /mailings/:id                → Mailings::show
PATCH  /mailings/:id                → Mailings::update
DELETE /mailings/:id                → Mailings::delete
POST   /mailings/:id/upload         → Mailings::upload
GET    /mailings/:id/preview        → Mailings::preview        (renders email_newsletter HTML, no send)
POST   /mailings/:id/test           → Mailings::test           [rate-limited: mailings_test, 5/60s]
POST   /mailings/:id/send           → Mailings::send
POST   /mailings/:id/cancel         → Mailings::cancel          (only from draft/sending; mid-send also cancels queued mailing_emails rows)

GET    /push/vapid-key              → PushSubscriptions::vapidKey   (public)
POST   /push/subscribe              → PushSubscriptions::subscribe  (public — a guest may subscribe before logging in; user_id is null until claimed on login) [rate-limited: push_subscribe, 10/60s]
DELETE /push/subscribe              → PushSubscriptions::unsubscribe (isAuth only; own endpoint only)

GET    /push-notifications          → PushNotifications::list
POST   /push-notifications          → PushNotifications::create
GET    /push-notifications/audiences → PushNotifications::audiences (push.manage privilege; declared before (:alphanum))
GET    /push-notifications/:id      → PushNotifications::show
PATCH  /push-notifications/:id      → PushNotifications::update
DELETE /push-notifications/:id      → PushNotifications::delete
POST   /push-notifications/:id/upload → PushNotifications::upload
POST   /push-notifications/:id/test  → PushNotifications::test   (synchronous — sends to the admin's own subscriptions only) [rate-limited: push_notifications_test, 5/60s]
POST   /push-notifications/:id/send  → PushNotifications::send   (enqueues push_notification_deliveries, one row per subscription)

GET   /members                      → Members::list
GET   /members/:id/events           → Members::events
PATCH /members/:id/roles            → Members::updateRoles     (replaces a user's full set of assigned roles)

GET    /roles                       → Roles::list
GET    /roles/permissions           → Roles::permissions       (the fixed Permission catalog, for the role-editor checkboxes; declared before (:num))
GET    /roles/:id                   → Roles::show
POST   /roles                       → Roles::create
PATCH  /roles/:id                   → Roles::update
DELETE /roles/:id                   → Roles::delete            (strips the role from every user's `roles` array first — see UsersModel::removeRoleFromAllUsers())

GET    /comments                    → Comments::index
GET    /comments/random             → Comments::random
POST   /comments                    → Comments::create         [rate-limited: comments_create, 10/60s]
DELETE /comments/:id                → Comments::delete

GET  /sitemap                       → Sitemap::index
```

All groups also register `OPTIONS (:any)` for CORS preflight.

Routes marked `[rate-limited: bucket, capacity/window]` are throttled per-IP by `RateLimitFilter` — see the Filters section below.

---

## Controllers (`app/Controllers/`)

All controllers extend `BaseApiController` (see API Responses below).

| File | Description |
|---|---|
| `Auth.php` | OAuth login via Google, Yandex, VK; passwordless magic-link email login; JWT issuance; `GET /auth/me` session check |
| `Camera.php` | Returns camera image data by numeric ID (2 s cache; a camera that doesn't answer within 3 s gets the offline placeholder, cached 30 s) |
| `Catalog.php` | OpenNGC reference catalog: search and lookup by any designation (read-only, FEAT-31) |
| `Categories.php` | Lists photo/object categories (read-only, locale-aware) |
| `Comments.php` | CRUD for user comments/reviews on events and photos; soft-delete, auth required for write |
| `Equipment.php` | Lists observatory equipment (read-only) |
| `Events.php` | Full CRUD for stargazing events; booking, cancellation, check-in, ticket/QR generation, Alfa-Bank payment flow, chunked gallery media (photo/video) uploads |
| `Files.php` | Serves raw files (FITS thumbnails, etc.) associated with astronomical objects |
| `Mailings.php` | Admin mailing campaign CRUD; audience targeting, test send and bulk send via `EmailLibrary`/`EmailQueueModel` |
| `Members.php` | Admin-only list of registered users and their event history |
| `PushSubscriptions.php` | User-facing Web Push opt-in/opt-out (`GET /push/vapid-key`, `POST`/`DELETE /push/subscribe`) — no privilege check; `subscribe()` is fully public (rate-limited) so guests can opt in from the site-wide stargazing banner, `unsubscribe()` still requires `isAuth` |
| `PushNotifications.php` | Admin push notification campaign CRUD; mirrors `Mailings.php` (audience targeting, test send via `WebPushLibrary`, bulk send via `PushNotificationDeliveriesModel`) — `push.manage` privilege |
| `Objects.php` | CRUD for astronomical objects catalog (locale-aware titles/descriptions); `show()` adds `catalog` — the OpenNGC facts of a linked object |
| `Observatory.php` | Live observatory status (FEAT-30 phase 1): the agent's snapshot push, the public status and events |
| `Photos.php` | CRUD for astrophoto archive; image upload via `PhotoUploadLibrary`; the plate solve of a photo (`astrometry()`, `solve()`) |
| `Relay.php` | Observatory power relay control (list state, toggle light with cooldown guard) |
| `Roles.php` | CRUD for roles (name + a set of `Permission` privileges); `permissions()` returns the fixed privilege catalog for the admin UI's checkbox list |
| `Sitemap.php` | Returns URL slugs for photos, objects, and events for sitemap generation |
| `Statistic.php` | Aggregates telescope imaging statistics per observing night (`ObjectFitsFilesModel::NIGHT_EXPRESSION`), optionally for one month |

---

## Models (`app/Models/`)

All models extend `ApplicationBaseModel` (which extends CI4 `Model`) unless noted.

### Core data

| File | Table | Soft-deletes | Notes |
|---|---|---|---|
| `ApplicationBaseModel.php` | — | — | Base class; adds `prepareOutput()` for stripping `hiddenFields` |
| `UsersModel.php` | `users` | yes | `UserEntity`; `roles` is a JSON array of `user_roles.id` values (see `RolesModel`) — a user can hold several roles; `session_token` powers logout revocation — see Authentication below |
| `RolesModel.php` | `user_roles` | no | `RoleEntity`; `permissions` is a JSON array of `App\Enums\Permission` values; `getPermissionsForIds()` resolves a user's effective privileges (union across all their roles); `countUsersPerRole()` powers the "assigned to N users" delete warning (single query for all roles, not one per role); `idsExist()` validates role ids before they're persisted onto a user; `DEVELOPER_ROLE_ID` (= 1, "Разработчик") is the one hardcoded role — see "The reserved developer role" in `docs/permissions.md` |
| `EventsModel.php` | `events` | yes | `EventEntity`; bilingual fields (`title_en/ru`, `content_en/ru`) |
| `EventsMediaModel.php` | `events_media` | yes | `EventMediaEntity`; photos **and** videos uploaded to a specific event, one chronological feed (`media_type` discriminator, `duration` for video); a video's poster frame reuses the `{file_name}_preview.jpg` convention |
| `EventsMediaUploadsModel.php` | `events_media_uploads` | no | `EventMediaUploadEntity`; ephemeral bookkeeping for an in-progress chunked upload (never displayed) — `mediaFinalize()` marks it `completed` and removes the temp chunks, `mediaCancel()` deletes both; an abandoned session (no cancel) stays behind — see CLI Commands below |
| `EventsUsersModel.php` | `events_users` | yes | Pivot: user bookings/check-ins for events |
| `ObjectsModel.php` | `objects` | yes | `ObjectEntity`; PK is `catalog_name` (string, e.g. `M31`) |
| `ObjectCategoryModel.php` | `objects_categories` | no | Pivot: object ↔ category |
| `ObjectFitsFilesModel.php` | `objects_fits_files` | yes | FITS file metadata per object; `NIGHT_EXPRESSION` names the observing night a frame belongs to (local noon → noon), `getNightsSummary()` counts nights per object, `getObjectOptics()` picks the optical train (focal length / pixel / sensor / scale) most of an object's frames share; indexed on (`object`, `date_obs`) |
| `ObjectFitsFiltersModel.php` | `objects_fits_filters` | yes | Filter data extracted from FITS files |
| `PhotosModel.php` | `photos` | yes | `PhotoEntity`; tracks `views` count |
| `PhotosAuthorModel.php` | `photos_authors` | yes | Author attribution for photos |
| `PhotosCategoryModel.php` | `photos_categories` | no | Pivot: photo ↔ category |
| `PhotosEquipmentsModel.php` | `photos_equipments` | no | Pivot: photo ↔ equipment used |
| `PhotosFiltersModel.php` | `photos_filters` | no | Filter metadata per photo |
| `PhotosObjectModel.php` | `photos_objects` | no | Pivot: photo ↔ astronomical object; `getObjectCovers()` — the newest photo and the photo count per object, for the catalog |
| `PhotosAstrometryModel.php` | `photos_astrometry` | no | `PhotoAstrometryEntity`; one row per photo (PK `photo_id`): the plate solve from nova.astrometry.net — `status` (`pending`/`solving`/`success`/`failed`) is the state `AstrometrySolver::step()` advances, `ra`/`dec`/`radius`/`pixscale`/`orientation`/`parity` the calibration, `wcs` the parsed TAN+SIP header (JSON, what `client/utils/wcs.ts` reads), `annotations` the service's catalogue objects (JSON), `solved_width`/`solved_height` the size of the `_large` file they are in pixels of; `enqueue()` is called by `Photos::upload()`/`Photos::solve()` |
| `CategoryModel.php` | `categories` | no | Shared photo/object categories |
| `CatalogModel.php` | `catalog` (+ `catalog_aliases`) | no | OpenNGC deep-sky catalog (array rows, auto-increment id); `findByName()` resolves any designation through the aliases, `search()`, `getForObject()` (via `objects.catalog_id`), `format()` = the camelCase API shape |
| `ObservatoryStatusModel.php` | `observatory_status` (+ `observatory_events`) | no | Latest agent snapshot (one row, id 1) and the event log (pruned after 90 days); `publicView()` / `recentEvents()` decide what visitors see |
| `ObservatoryEquipmentModel.php` | `observatory_equipment` | no | Equipment inventory (type, brand, model, specs) |
| `ObservatorySettingsModel.php` | `observatory_settings` | no | Key-value store for observatory config |
| `CommentsModel.php` | `comments` | yes | Comments/reviews on events and photos; `entity_type` ENUM: `event`, `photo` |
| `MailingsModel.php` | `mailings` | yes | Email campaign records (subject, content, status, send counts) |
| `MailingEmailsModel.php` | `mailing_emails` | no | Individual recipient entries per mailing |
| `MailingUnsubscribesModel.php` | `mailing_unsubscribes` | no | Unsubscribe log (email + optional user_id) |
| `PushSubscriptionsModel.php` | `push_subscriptions` | no | `PushSubscriptionEntity`; one row per browser/device opted into push; unique `endpoint`; `upsertByEndpoint()` refreshes keys instead of duplicating; `user_id` is nullable — a guest may subscribe before logging in, `upsertByEndpoint()` claims the row for a user once they do (and never downgrades an already-claimed row back to anonymous); `findAnonymous()`/`countAnonymous()` surface still-unclaimed rows so an "all" campaign reaches them directly (there's no `user_id` to join through) |
| `PushNotificationsModel.php` | `push_notifications` | yes | `PushNotificationEntity`; browser push campaign records (title/body/icon/url/status/audience/counts) — mirrors `MailingsModel` |
| `PushNotificationDeliveriesModel.php` | `push_notification_deliveries` | no | `PushNotificationDeliveryEntity`; one row per (notification, subscription) pair — mirrors `MailingEmailsModel` but keyed by subscription, not user; `subscription_id` FK is `SET NULL` (not `CASCADE`), so the row survives as a permanent send-audit record if the subscription is later hard-deleted |
| `PaymentsModel.php` | `payments` | yes | Alfa-Bank payment records for event tickets; statuses include refunding |
| `EmailQueueModel.php` | `email_queue` | no | Queued transactional/mailing emails for async sending |
| `MagicLinkTokensModel.php` | `magic_link_tokens` | no | Single-use passwordless login tokens (SHA-256 hash only, raw token never persisted); rows double as the rate-limit ledger — see `isRateLimited()` |

---

## Migration History (`app/Database/Migrations/`)

Run `ls app/Database/Migrations` for the full list. Non-obvious ones:

- `2026-11-04-100000_AddCatalog` — `catalog` (OpenNGC, one row per real object), `catalog_aliases` (normalised designation → catalog row: Messier/NGC/IC cross ids, PGC/UGC/… identifiers, duplicate entries) and `objects.catalog_id`; filled by `php spark catalog:import`.
- `2026-11-04-110000_AddObservatoryStatus` — `observatory_status` (latest agent snapshot) and `observatory_events`.
- `2026-11-02-100000_AddPhotosAstrometry` — `photos_astrometry`, the plate solve per photo (see `PhotosAstrometryModel`); `status` is a VARCHAR, not an ENUM, so the migration also runs on SQLite.
- `2026-10-30-100000_ObjectsRedesign` — `objects.distance` (light years) / `objects.magnitude` (optional, editor-filled facts for the object page) and the (`object`, `date_obs`) index on `objects_fits_files` behind the per-night aggregations.

- `2026-08-13-100001_AddRolesTable` — seeds 3 starter roles (Разработчик/Команда/Охрана); role id 1 ("Разработчик") is reserved, see `RolesModel::DEVELOPER_ROLE_ID`.
- `2026-08-13-100002_AddUsersRolesColumn` — adds `users.roles JSON`, backfilled from the legacy `users.role` ENUM, which is left in place as a rollback safety net.
- `2026-08-17-110000_FixPushNotificationDeliveriesSubscriptionCascade` — `push_notification_deliveries.subscription_id` FK is `SET NULL`, not `CASCADE`, so a delivery row survives when `system:send-push` deletes an expired subscription.
- `2026-08-21-100000_RenameEventsPhotosToEventsMedia` — `events_photos` → `events_media`; the index is renamed with a raw `ALTER TABLE ... RENAME INDEX`, since `RENAME TABLE` keeps index names verbatim and Forge has no `renameIndex`.
- `2026-11-03-100000_AddEventsDateIndex` — index `events_date` on `events.date`, the column every public events query filters and sorts by.

---

## Key Conventions

### Query Builder
- Use `select()`, not `selectRaw()` — CI4's Query Builder has no `selectRaw()` method.
- Use `$db->table()` or model query builder methods. Raw SQL goes in `$db->query()`.

### API Responses
- All JSON responses use **camelCase** field names.
- Formatting is done in the model/entity layer (or entity `__get` casts), not in the controller.
- All controllers extend `App\Controllers\BaseApiController` (not `ResourceController`/`ResponseTrait` directly). Success responses still go through `$this->respond($data)`; errors use its helpers — `respondError()`, `respondValidationErrors()`, `respondNotFound()`, `respondUnauthorized()`, `respondForbidden()`, `respondConflict()`, `respondServerError()` — which all produce the same envelope: `{"message": "..."}`, or `{"message": "...", "errors": {"field": "..."}}` for validation. The HTTP status carries the error's type (400/401/403/404/409/500); the body never repeats it. Any exception that escapes a controller uncaught still lands in this same shape via `App\Libraries\ApiExceptionHandler` (see `Config\Exceptions::handler()`).
- **Never surface a technical/parameter-shape message to the client.** If a failure is reachable only via a direct API call or a frontend bug — not anything a real user did through the intended UI (a missing/invalid query or body param the frontend always sends correctly, e.g. `entityType`/`entityId`, `id`, `mail`) — use `respondInvalidRequest(string $logReason)` instead of a translated, parameter-naming message: it logs `$logReason` for debugging and always returns the same generic `App.invalidRequest` text to the client. Two reasons: the message would be meaningless to a user who never typed anything the parameter refers to, and naming internal parameter/field names in a client-visible message leaks the API's contract to anyone probing it. This does **not** apply to real form validation or business-rule conflicts (wrong ticket count, event already booked, name already taken, OAuth provider didn't return an email, ...) — those are genuinely reachable by a user through the UI and must keep a message that actually helps them fix it.

### Soft Deletes
- Most models set `$useSoftDeletes = true` with a `deleted_at DATETIME NULL` column.
- Never use hard deletes unless the model explicitly omits soft-delete.

### Authentication
- Auth is JWT-based, validated via the `auth` helper in `SessionLibrary`.
- Instantiate in controller: `$this->session = new SessionLibrary();`
- Check auth: `$this->session->isAuth` (bool)
- Get current user: `$this->session->user` (returns `UserEntity | null`)
- Check a privilege: `$this->session->can(Permission::X)` (bool) — resolved from the union of every role in `$this->session->user->roles`; no admin bypass, see `docs/permissions.md`
- **Token lifetime is intentionally long** (`auth.token.live`, currently 180 days) — logout does not shorten it. Instead, revocation is layered on top via `users.session_token`:
  - The JWT carries a `sid` claim = `users.session_token` at issuance time (`generateAuthToken($email, $sessionToken)`).
  - `validateAuthToken()` rejects the token if `sid` doesn't match the user's current `session_token` (or if it's `NULL`) — checked on every request, piggybacking on the user row `SessionLibrary` already loads (no extra query).
  - On login (`Auth::_serviceAuth()`, `Auth::verifyMagicLink()`), `Auth::ensureSessionToken()` generates a `session_token` only if the user doesn't already have one — logging in on a new device does **not** invalidate sessions already active elsewhere.
  - `POST /auth/logout` (`Auth::logout()`) clears `session_token` to `NULL`, instantly invalidating every token issued to that user, on every device, regardless of `exp`. The next login mints a fresh `session_token` and full-lifetime tokens work normally again.
  - `session_token` is never exposed in API responses — `Auth::responseAuth()` strips it from the returned user object the same way it strips `auth_type`; the raw `roles` id array is likewise replaced with `roles` (role names, display-only) and `permissions` (the flat privilege list actually used for access checks).

### Bilingual Content
- Events and Objects store bilingual text as separate columns: `title_en`, `title_ru`, `content_en`, `content_ru`, etc. Event location (`location`, `address`, `latitude`, `longitude`, `min_age`) is single-language.
- Locale is resolved per-request via `LocaleLibrary`.

### Event Location & Map
- `events` columns: `location` (venue name), `address` (free-text), `latitude`/`longitude` (`DECIMAL(10,7)`, default the observatory's usual field), `min_age` (nullable), `end_date` (nullable).
- `address`/`latitude`/`longitude` (not `location`, `min_age`, or `end_date`) are stripped from the API response until the viewer has a booking for an *upcoming* event that `requires_registration` — see `EventsModel::isUpcoming()` and the gating in `Events::show()`/`Events::upcoming()`. `location` (the general venue name) is always public. Past events and no-registration events are never gated. `Events::show()` also exempts a viewer holding `EVENTS_UPDATE` (staff editing the event on `/stargazing/form`), regardless of their own booking status — `Events::upcoming()` (the public homepage widget) has no such exemption since it's never used for editing.
- No `yandex_map_link`/`google_map_link` columns anymore — the frontend generates map links on the fly from coordinates (`client/utils/maps.ts`).

### Language Files
- Located in `app/Language/en/` and `app/Language/ru/`.
- Files: `App.php`, `Auth.php`, `Catalog.php`, `Categories.php`, `Comments.php`, `Events.php`, `General.php`, `Mailings.php`, `Members.php`, `Objects.php`, `Photos.php`, `PushNotifications.php`, `Relay.php`, `Roles.php`, `Validation.php` (plus `ru/Files.php`, which overrides the framework's own `Files` keys).
- Never name a lang file after a framework one (`Files`, `Validation`, …) for a new namespace — it collides with CI4's system language files.
- Load with: `lang('Events.someKey')` after `LocaleLibrary` sets the locale.

### Libraries (`app/Libraries/`)
| Library | Purpose |
|---|---|
| `SessionLibrary` | JWT validation, populates `$this->session->user` and `->isAuth` |
| `LocaleLibrary` | Sets CI4 locale from request header or user preference |
| `EmailLibrary` | Wraps CodeIgniter email service for mailing campaigns |
| `RelayLibrary` | HTTP communication with the RODOS relay board (3 s read / 5 s write timeouts, so a hung link never blocks the dashboard) |
| `PhotoUploadLibrary` | Handles photo file validation, resizing (`_small` 160×36 strip, `_thumb` 160×160 square, `_medium` 500×400, `_large` 4096 wide), and storage |
| `PhotosLibrary` | Helper utilities for photo data aggregation |
| `StatisticLibrary` | Aggregation helpers for telescope statistics |
| `GoogleClient` / `YandexClient` / `VkClient` | OAuth provider integrations |
| `PaymentLibrary` | Gateway-agnostic payment orchestration (uses `PaymentGatewayInterface`) |
| `PaymentGatewayInterface` | Contract a new payment provider must implement |
| `AlfaBankClient` | Current `PaymentGatewayInterface` implementation; test/production environment switch |
| `TicketLibrary` | Renders event ticket PNGs (static background asset + QR code) for check-in |
| `CalendarLibrary` | Builds ICS calendar attachments for event emails |
| `ApiExceptionHandler` | Renders uncaught exceptions in the `{message, errors?}` envelope (`Config\Exceptions::handler()`) |
| `WebPushLibrary` | Thin wrapper around `Minishlink\WebPush\WebPush` (VAPID keys from `Config\Push`); throws `WebPushExpiredSubscriptionException` on HTTP 404/410 |
| `AstrometryClient` | nova.astrometry.net API (key from `Config\Astrometry` / `astrometry.apiKey`): login, image upload, submission → job → calibration/annotations, and `parseWcsHeader()` for the WCS FITS header; every failure is a `RuntimeException` |
| `CatalogLibrary` | OpenNGC helpers: `normalize()` (designation key, same rules as the observatory pipeline plus dropped leading zeros: `M 31`/`m_31` → `M31`, `NGC0224` → `NGC224`, `Sh2_103` → `SH2-103`; null for non-designations), CSV parsing, catalog rows, aliases, duplicates |
| `AstrometrySolver` | The plate solve as a state machine advanced one non-blocking step at a time (`step()`): `pending` → upload the `_large` file → `solving`; `solving` → ask for the job and its status → `success` (calibration + WCS + annotations stored) or `failed` (reason in `error`; a job older than 30 min times out). Driven by `Photos::solve()` from the editor's browser, or by `photos:solve` in a loop |

### Filters (`app/Filters/`)
| Filter | Purpose |
|---|---|
| `PublicCacheFilter` | `Cache-Control: public, max-age=N, stale-while-revalidate=4N` on viewer-independent public GETs (catalogue, photos, categories, equipment, FITS lists, statistics, random comments, sitemap). Alias `publiccache`, applied per route as `['filter' => 'publiccache:<seconds>']`; only a 200 to a request without an `Authorization` header gets the header, with `Vary: Locale, Authorization` (the body depends on the `Locale` header). The default `no-store` is removed first — CI4's `setHeader()` appends to a multi-value header. |
| `RateLimitFilter` | Per-IP token-bucket throttling for abuse-prone public routes. Registered as alias `ratelimit` in `Config/Filters.php`; applied per-route via `['filter' => 'ratelimit:<bucket>,<capacity>,<seconds>']` (see route table above for current buckets). Disabled when `ENVIRONMENT === 'testing'` since the `file` cache backend is shared across test cases. Uses CI4's built-in `Services::throttler()`. |
| `ObservatoryAgentFilter` | Alias `observatoryagent`: only lets through `Authorization: Bearer <observatory.agentToken>` (constant-time compare; a token shorter than 32 characters or none refuses everything) — the observatory agent's endpoints |
| `CorsFilter` | Legacy/unused — superseded by CI4's built-in `Cors` filter (`Config\Cors`); left in place as a removal marker only. |

### CLI Commands (`app/Commands/`)
| Command | Group | Purpose |
|---|---|---|
| `system:send-email` | system | Drains the mailing queue (`mailing_emails`) and the transactional email outbox (`email_queue`), subject to `Config\MailingLimits` day/hour caps |
| `system:send-push` | system | Drains the Web Push delivery queue (`push_notification_deliveries`), batch size 50, no rate-limit cap (push has no SMTP-style provider reputation limit) — deletes the `push_subscriptions` row on a 404/410 (`WebPushExpiredSubscriptionException`) |
| `catalog:import` | Observatory | Imports OpenNGC (`NGC.csv` + `addendum.csv`, downloaded from GitHub or `--dir path`) into `catalog`, rebuilds `catalog_aliases`, links `objects.catalog_id`; idempotent (upsert by OpenNGC name), prints the objects it couldn't link. Run once after the migration and again for a new OpenNGC release |
| `fits:recalculate` | Observatory | Recalculates FITS filter aggregates (no HTTP endpoint) |
| `photos:thumbnails` | Observatory | Generates the square `_thumb` (160×160) preview for photos uploaded before 4.15.0 (`--force` regenerates all); new uploads get it from `PhotoUploadLibrary` |
| `photos:solve` | Observatory | Plate-solves photos from the command line by looping `AstrometrySolver::step()` (about a minute each): `--limit N` (default 3) rows in progress, `--all` first queues every never-solved photo (the one-time backfill of the archive), `--photo ID` (re)solves one photo. Spark passes options as `--name value`; the command also accepts `--name=value`. Not a cron job — new uploads are solved from the editor's browser via `POST /photos/:id/astrometry` |

`send-email` and `send-push` are registered for the same `* * * * *` cron cadence on the hosting cron (outside this repo).

There is no automatic cleanup of abandoned chunked uploads (tab closed or network dropped without a cancel): their parts stay in `UPLOAD_EVENTS/{eventId}/tmp/{sessionId}/` and the `events_media_uploads` row stays `uploading`/`finalizing`. Uploads are rare, so these are removed by hand on the server.

### IDs
- Most models use `$useAutoIncrement = false` with string `uniqid()` PKs from `ApplicationBaseModel::generateId` (`beforeInsert`).
- Auto-increment integer PKs: `CategoryModel`, `RolesModel`, `ObservatoryEquipmentModel`.

### Testing
- Always run `composer test` after any change.
- Tests live in `server/tests/` and use PHPUnit 11.5 against in-memory SQLite (`phpunit.xml.dist`) — no live DB needed.
- Layout: `tests/unit/{Entities,Helpers,Libraries,Models}`, `tests/feature` (controller guards), fixtures in `tests/_support/`.
