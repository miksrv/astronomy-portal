# server/CLAUDE.md

Backend-specific reference for the CodeIgniter 4 PHP API. For project-wide context, dev commands, and deployment see the root `CLAUDE.md`.

## API Routes (`app/Config/Routes.php`)

```
GET  /                              → API health info (inline closure)

GET  /camera/:id                    → Camera::show

GET  /statistic/telescope           → Statistic::telescope

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

GET  /equipments                    → Equipment::list
GET  /categories                    → Categories::list

GET    /objects                     → Objects::list
GET    /objects/:name               → Objects::show
POST   /objects                     → Objects::create
PATCH  /objects/:name               → Objects::update
DELETE /objects/:name               → Objects::delete

GET  /fits/:name                    → Fits::show   ⚠ controller file does not exist yet

GET    /photos                      → Photos::list
GET    /photos/:id                  → Photos::show
POST   /photos                      → Photos::create
POST   /photos/:id/upload           → Photos::upload
PATCH  /photos/:id                  → Photos::update
DELETE /photos/:id                  → Photos::delete

GET    /events                      → Events::list   (optional `?userId=` narrows to that user's own attended events — only honoured when it matches the caller's own session, otherwise silently ignored)
GET    /events/upcoming             → Events::upcoming
GET    /events/upcoming/registered  → Events::upcomingRegistered
GET    /events/media                → Events::media   (one chronological feed of both photos and videos; `mediaType`/`duration` per item)
GET    /events/:id/statistic        → Events::statistic
GET    /events/:id/registrations    → Events::registrations
GET    /events/:id                  → Events::show
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
GET    /mailings/unsubscribe        → Mailings::unsubscribe  (public; declared before (:alphanum))
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

All controllers extend `ResourceController` and use the `ResponseTrait`.

| File | Description |
|---|---|
| `Auth.php` | OAuth login via Google, Yandex, VK; passwordless magic-link email login; JWT issuance; `GET /auth/me` session check |
| `Camera.php` | Returns camera image data by numeric ID (short cache TTL) |
| `Categories.php` | Lists photo/object categories (read-only, locale-aware) |
| `Comments.php` | CRUD for user comments/reviews on events and photos; soft-delete, auth required for write |
| `Equipment.php` | Lists observatory equipment (read-only) |
| `Events.php` | Full CRUD for stargazing events; booking, cancellation, check-in, ticket/QR generation, Alfa-Bank payment flow, chunked gallery media (photo/video) uploads |
| `Files.php` | Serves raw files (FITS thumbnails, etc.) associated with astronomical objects |
| `Mailings.php` | Admin mailing campaign CRUD; audience targeting, test send and bulk send via `EmailLibrary`/`EmailQueueModel` |
| `Members.php` | Admin-only list of registered users and their event history |
| `PushSubscriptions.php` | User-facing Web Push opt-in/opt-out (`GET /push/vapid-key`, `POST`/`DELETE /push/subscribe`) — no privilege check; `subscribe()` is fully public (rate-limited) so guests can opt in from the site-wide stargazing banner, `unsubscribe()` still requires `isAuth` |
| `PushNotifications.php` | Admin push notification campaign CRUD; mirrors `Mailings.php` (audience targeting, test send via `WebPushLibrary`, bulk send via `PushNotificationDeliveriesModel`) — `push.manage` privilege |
| `Objects.php` | CRUD for astronomical objects catalog (locale-aware titles/descriptions) |
| `Photos.php` | CRUD for astrophoto archive; image upload via `PhotoUploadLibrary` |
| `Relay.php` | Observatory power relay control (list state, toggle light with cooldown guard) |
| `Roles.php` | CRUD for roles (name + a set of `Permission` privileges); `permissions()` returns the fixed privilege catalog for the admin UI's checkbox list |
| `Sitemap.php` | Returns URL slugs for photos, objects, and events for sitemap generation |
| `Statistic.php` | Aggregates telescope imaging statistics (exposure time, filter usage) by month |

---

## Models (`app/Models/`)

All models extend `ApplicationBaseModel` (which extends CI4 `Model`) unless noted.

### Core data

| File | Table | Soft-deletes | Notes |
|---|---|---|---|
| `ApplicationBaseModel.php` | — | — | Base class; adds `prepareOutput()` for stripping `hiddenFields` |
| `UsersModel.php` | `users` | yes | `UserEntity`; `roles` is a JSON array of `user_roles.id` values (see `RolesModel`) — a user can hold several roles; UUID PKs; `session_token` powers logout revocation — see Authentication below |
| `RolesModel.php` | `user_roles` | no | `RoleEntity`; `permissions` is a JSON array of `App\Enums\Permission` values; `getPermissionsForIds()` resolves a user's effective privileges (union across all their roles); `countUsersPerRole()` powers the "assigned to N users" delete warning (single query for all roles, not one per role); `idsExist()` validates role ids before they're persisted onto a user; `DEVELOPER_ROLE_ID` (= 1, "Разработчик") is the one hardcoded role — see "The reserved developer role" in the root README |
| `EventsModel.php` | `events` | yes | `EventEntity`; bilingual fields (`title_en/ru`, `content_en/ru`) |
| `EventsMediaModel.php` | `events_media` | yes | `EventMediaEntity`; photos **and** videos uploaded to a specific event, one chronological feed (`media_type` discriminator, `duration` for video); a video's poster frame reuses the `{file_name}_preview.jpg` convention |
| `EventsMediaUploadsModel.php` | `events_media_uploads` | no | `EventMediaUploadEntity`; ephemeral bookkeeping for an in-progress chunked upload (never displayed) — removed outright by `Events::mediaCancel()` or swept by `media:cleanup-uploads` via `getStaleSessions()` |
| `EventsUsersModel.php` | `events_users` | yes | Pivot: user bookings/check-ins for events |
| `ObjectsModel.php` | `objects` | yes | `ObjectEntity`; PK is `catalog_name` (string, e.g. `M31`) |
| `ObjectCategoryModel.php` | `objects_categories` | no | Pivot: object ↔ category |
| `ObjectFitsFilesModel.php` | `objects_fits_files` | yes | FITS file metadata per object |
| `ObjectFitsFiltersModel.php` | `objects_fits_filters` | yes | Filter data extracted from FITS files |
| `PhotosModel.php` | `photos` | yes | `PhotoEntity`; tracks `views` count |
| `PhotosAuthorModel.php` | `photos_authors` | yes | Author attribution for photos |
| `PhotosCategoryModel.php` | `photos_categories` | no | Pivot: photo ↔ category |
| `PhotosEquipmentsModel.php` | `photos_equipments` | no | Pivot: photo ↔ equipment used |
| `PhotosFiltersModel.php` | `photos_filters` | no | Filter metadata per photo |
| `PhotosObjectModel.php` | `photos_objects` | no | Pivot: photo ↔ astronomical object |
| `CategoryModel.php` | `categories` | no | Shared photo/object categories |
| `ObservatoryEquipmentModel.php` | `observatory_equipment` | no | Equipment inventory (type, brand, model, specs) |
| `ObservatorySettingsModel.php` | `observatory_settings` | no | Key-value store for observatory config; extends CI4 `Model` directly |
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

Listed in execution order. Tables created unless noted as ALTER.

| Migration file | Creates / Alters |
|---|---|
| `2024-10-22-100000_AddCategories` | `categories` |
| `2024-10-22-100000_AddEvents` | `events` |
| `2024-10-22-100000_AddObjects` | `objects` |
| `2024-10-22-100000_AddUsers` | `users` |
| `2024-10-22-111100_AddObjectsCategories` | `objects_categories` |
| `2024-10-22-111100_AddObservatoryEquipment` | `observatory_equipment` |
| `2024-10-22-111100_AddObservatorySettings` | `observatory_settings` |
| `2024-10-22-111100_AddPhotos` | `photos` |
| `2024-10-22-111100_AddPhotosAuthors` | `photos_authors` |
| `2024-10-22-111500_AddEventsPhotos` | `events_photos` |
| `2024-10-22-111500_AddEventsUsers` | `events_users` |
| `2024-10-22-120000_AddObjectsFitsFiles` | `objects_fits_files` |
| `2024-10-22-120000_AddPhotosCategories` | `photos_categories` |
| `2024-10-22-120000_AddPhotosEquipments` | `photos_equipments` |
| `2024-10-22-120000_AddPhotosFilters` | `photos_filters` |
| `2024-10-22-120000_AddPhotosObjects` | `photos_objects` |
| `2024-10-23-111100_AddObjectsFitsFilters` | `objects_fits_filters` |
| `2025-05-01-100000_AddMailings` | `mailings` |
| `2025-05-01-100001_AddMailingEmails` | `mailing_emails` |
| `2025-05-01-100002_AddMailingUnsubscribes` | `mailing_unsubscribes` |
| `2025-05-01-100003_AddUserSettings` | ALTER `users` — adds `settings JSON` column |
| `2025-05-20-100000_AddMailingAudience` | ALTER `mailings` — adds audience-targeting columns |
| `2026-04-16-100000_AddPhotosViews` | ALTER `photos` — adds `views INT` column |
| `2026-04-16-110000_AddComments` | `comments` |
| `2026-06-22-100000_AddEventTicketPrice` | ALTER `events` — adds ticket pricing columns |
| `2026-06-22-100001_AddPayments` | `payments` |
| `2026-06-22-100002_AddEventUserPaymentColumns` | ALTER `events_users` — adds payment status/reference columns |
| `2026-06-24-100000_AddEmailQueue` | `email_queue` |
| `2026-07-02-100000_AddEventUsersPaymentForeignKey` | ALTER `events_users` — FK to `payments` |
| `2026-07-02-110000_AddEventUsersFailedStatus` | ALTER `events_users` — adds a `failed` payment status |
| `2026-07-03-100000_AddMagicLinkTokens` | `magic_link_tokens` |
| `2026-07-03-100001_AddUserAuthTypeEmail` | ALTER `users` — adds `email` as an auth type (alongside OAuth) |
| `2026-07-03-100002_AddPaymentsRefundingStatus` | ALTER `payments` — adds a `refunding` status |
| `2026-07-03-100003_AddEventUsersActiveBookingUniqueKey` | ALTER `events_users` — unique key preventing duplicate active bookings |
| `2026-07-04-100000_AddEventRequiresRegistration` | ALTER `events` — adds `requires_registration` flag |
| `2026-07-06-100000_AddUsersSessionToken` | ALTER `users` — adds `session_token` (logout revocation, see Authentication above) |
| `2026-07-07-100000_ReworkEventLocationFields` | ALTER `events` — replaces bilingual venue name/manual map links with `location`/`address`/`latitude`/`longitude`/`min_age`/`end_date` |
| `2026-07-09-100000_AddEmailQueueIcsAttachment` | ALTER `email_queue` — adds ICS calendar attachment column |
| `2026-08-13-100000_AddMailingsCanceledStatus` | ALTER `mailings` and `mailing_emails` — adds a `canceled` status |
| `2026-08-13-100001_AddRolesTable` | `user_roles` — seeds 3 starter roles (Разработчик/Команда/Охрана) preserving the legacy `users.role` ENUM's behaviour; role id 1 ("Разработчик") is reserved/hardcoded, see `RolesModel::DEVELOPER_ROLE_ID` |
| `2026-08-13-100002_AddUsersRolesColumn` | ALTER `users` — adds `roles JSON` (array of `roles.id`), backfilled from the legacy `role` column, which is left in place for now as a rollback safety net |
| `2026-08-14-100000_AddEventPhotosGroupingFields` | ALTER `events_photos` — adds grouping fields |
| `2026-08-16-100000_AddPushSubscriptions` | `push_subscriptions` — FEAT-13 Web Push; one row per browser/device, unique `endpoint`, FK to `users` (CASCADE) |
| `2026-08-16-100001_AddPushNotifications` | `push_notifications` — FEAT-13; mirrors `mailings` (title/body/icon/url/status/audience/counts) |
| `2026-08-16-100002_AddPushNotificationDeliveries` | `push_notification_deliveries` — FEAT-13; mirrors `mailing_emails`, keyed by `subscription_id` rather than user |
| `2026-08-17-100000_AllowAnonymousPushSubscriptions` | ALTER `push_subscriptions` — `user_id` becomes nullable, so a guest can subscribe before logging in (FK left untouched — NULL is exempt from the CASCADE) |
| `2026-08-17-110000_FixPushNotificationDeliveriesSubscriptionCascade` | ALTER `push_notification_deliveries` — `subscription_id` becomes nullable and its FK to `push_subscriptions` switches from `CASCADE` to `SET NULL`, so a delivery row survives (as a permanent send-audit record, `status` intact) when `system:send-push` hard-deletes an expired subscription, instead of being cascade-deleted along with it |
| `2026-08-21-100000_RenameEventsPhotosToEventsMedia` | RENAME `events_photos` → `events_media`; `image_width`/`image_height` → `width`/`height`, `file_size` INT → BIGINT UNSIGNED (a video may reach the 2GB ceiling), + `media_type ENUM('photo','video')` and `duration SMALLINT UNSIGNED NULL`; the index is renamed with a raw `ALTER TABLE ... RENAME INDEX` since MySQL's `RENAME TABLE` preserves index names verbatim |
| `2026-08-21-100001_AddEventsMediaUploads` | `events_media_uploads` — FEAT-26 chunked-upload session bookkeeping (event/user FK CASCADE, `total_size`/`chunk_size`/`received_bytes`, `status ENUM('uploading','finalizing','completed','aborted')`) |

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
- Check a privilege: `$this->session->can(Permission::X)` (bool) — resolved from the union of every role in `$this->session->user->roles`; no admin bypass, see "User Roles & Permissions" in the root `README.md`
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
- Files: `App.php`, `Auth.php`, `Categories.php`, `Comments.php`, `Events.php`, `General.php`, `Mailings.php`, `Members.php`, `Objects.php`, `Photos.php`, `PushNotifications.php`, `Roles.php`, `Validation.php`.
- Load with: `lang('Events.someKey')` after `LocaleLibrary` sets the locale.

### Libraries (`app/Libraries/`)
| Library | Purpose |
|---|---|
| `SessionLibrary` | JWT validation, populates `$this->session->user` and `->isAuth` |
| `LocaleLibrary` | Sets CI4 locale from request header or user preference |
| `EmailLibrary` | Wraps CodeIgniter email service for mailing campaigns |
| `RelayLibrary` | HTTP communication with Arduino relay board |
| `PhotoUploadLibrary` | Handles photo file validation, resizing, and storage |
| `PhotosLibrary` | Helper utilities for photo data aggregation |
| `CatalogLibrary` | Utilities for FITS catalog data processing |
| `StatisticLibrary` | Aggregation helpers for telescope statistics |
| `GoogleClient` / `YandexClient` / `VkClient` | OAuth provider integrations |
| `PaymentLibrary` | Gateway-agnostic payment orchestration (uses `PaymentGatewayInterface`) |
| `PaymentGatewayInterface` | Contract a new payment provider must implement |
| `AlfaBankClient` | Current `PaymentGatewayInterface` implementation; test/production environment switch |
| `TicketLibrary` | Renders event ticket PNGs (static background asset + QR code) for check-in |
| `WebPushLibrary` | Thin wrapper around `Minishlink\WebPush\WebPush` (VAPID keys from `Config\Push`); throws `WebPushExpiredSubscriptionException` on HTTP 404/410 |

### Filters (`app/Filters/`)
| Filter | Purpose |
|---|---|
| `RateLimitFilter` | Per-IP token-bucket throttling for abuse-prone public routes. Registered as alias `ratelimit` in `Config/Filters.php`; applied per-route via `['filter' => 'ratelimit:<bucket>,<capacity>,<seconds>']` (see route table above for current buckets). Disabled when `ENVIRONMENT === 'testing'` since the `file` cache backend is shared across test cases. Uses CI4's built-in `Services::throttler()`. |
| `CorsFilter` | Legacy/unused — superseded by CI4's built-in `Cors` filter (`Config\Cors`); left in place as a removal marker only. |

### CLI Commands (`app/Commands/`)
| Command | Group | Purpose |
|---|---|---|
| `system:send-email` | system | Drains the mailing queue (`mailing_emails`) and the transactional email outbox (`email_queue`), subject to `Config\MailingLimits` day/hour caps |
| `system:send-push` | system | Drains the Web Push delivery queue (`push_notification_deliveries`), batch size 50, no rate-limit cap (push has no SMTP-style provider reputation limit) — deletes the `push_subscriptions` row on a 404/410 (`WebPushExpiredSubscriptionException`) |
| `media:cleanup-uploads` | system | Purges abandoned chunked-upload sessions (`events_media_uploads` still `uploading`/`finalizing` after 24h) and their `UPLOAD_EVENTS/{eventId}/tmp/{sessionId}/` chunk directories |
| `fits:recalculate` | — | Recalculates FITS filter aggregates (no HTTP endpoint) |

`send-email` and `send-push` are registered for the same `* * * * *` cron cadence on the hosting cron (outside this repo).

**`media:cleanup-uploads` is not registered on the hosting cron yet** — it ships with FEAT-26 but has to be added to the host's crontab by hand as a deployment step, since the crontab lives outside this repo. Until that is done, an abandoned chunked upload's temp chunk directory (`UPLOAD_EVENTS/{eventId}/tmp/{sessionId}/`) is only removed when the uploader explicitly cancels; a session abandoned outright (tab closed, network dropped) keeps its parts on disk indefinitely. The line to add, alongside the two above:

```
* * * * * cd /path/to/server && php spark media:cleanup-uploads >> /dev/null 2>&1
```

Remove this note once the entry is live on the host.

### UUIDs / IDs
- Most models use `$useAutoIncrement = false` with string/UUID PKs generated in `beforeInsert` callbacks.
- Exception: `ObservatoryEquipmentModel` uses auto-increment integer PK.

### Testing
- Always run `composer test` after any change.
- Tests live in `server/tests/` and use PHPUnit 11.5.
