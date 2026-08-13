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

GET    /events                      → Events::list
GET    /events/upcoming             → Events::upcoming
GET    /events/upcoming/registered  → Events::upcomingRegistered
GET    /events/photos               → Events::photos
GET    /events/:id/statistic        → Events::statistic
GET    /events/:id/registrations    → Events::registrations
GET    /events/:id                  → Events::show
GET    /events/members/:id          → Events::members
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
POST   /events/registrations/:id/refund → Events::refundRegistrationPayment (admin only — forced refund + cancellation)
POST   /events/upload/:id           → Events::upload

GET    /mailings                    → Mailings::list
POST   /mailings                    → Mailings::create
GET    /mailings/unsubscribe        → Mailings::unsubscribe  (public; declared before (:alphanum))
GET    /mailings/audiences          → Mailings::audiences    (admin; declared before (:alphanum))
GET    /mailings/:id                → Mailings::show
PATCH  /mailings/:id                → Mailings::update
DELETE /mailings/:id                → Mailings::delete
POST   /mailings/:id/upload         → Mailings::upload
GET    /mailings/:id/preview        → Mailings::preview        (renders email_newsletter HTML, no send)
POST   /mailings/:id/test           → Mailings::test           [rate-limited: mailings_test, 5/60s]
POST   /mailings/:id/send           → Mailings::send
POST   /mailings/:id/cancel         → Mailings::cancel          (only from draft/sending; mid-send also cancels queued mailing_emails rows)

GET  /members                       → Members::list
GET  /members/:id/events            → Members::events

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
| `Events.php` | Full CRUD for stargazing events; booking, cancellation, check-in, ticket/QR generation, Alfa-Bank payment flow, photo uploads, Telegram notifications |
| `Files.php` | Serves raw files (FITS thumbnails, etc.) associated with astronomical objects |
| `Mailings.php` | Admin mailing campaign CRUD; audience targeting, test send and bulk send via `EmailLibrary`/`EmailQueueModel` |
| `Members.php` | Admin-only list of registered users and their event history |
| `Objects.php` | CRUD for astronomical objects catalog (locale-aware titles/descriptions) |
| `Photos.php` | CRUD for astrophoto archive; image upload via `PhotoUploadLibrary` |
| `Relay.php` | Observatory power relay control (list state, toggle light with cooldown guard) |
| `Sitemap.php` | Returns URL slugs for photos, objects, and events for sitemap generation |
| `Statistic.php` | Aggregates telescope imaging statistics (exposure time, filter usage) by month |

---

## Models (`app/Models/`)

All models extend `ApplicationBaseModel` (which extends CI4 `Model`) unless noted.

### Core data

| File | Table | Soft-deletes | Notes |
|---|---|---|---|
| `ApplicationBaseModel.php` | — | — | Base class; adds `prepareOutput()` for stripping `hiddenFields` |
| `UsersModel.php` | `users` | yes | `UserEntity`; roles: `user`, `moderator`, `admin`; UUID PKs; `session_token` powers logout revocation — see Authentication below |
| `EventsModel.php` | `events` | yes | `EventEntity`; bilingual fields (`title_en/ru`, `content_en/ru`) |
| `EventsPhotosModel.php` | `events_photos` | yes | Pivot: photos uploaded to a specific event |
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

---

## Key Conventions

### Query Builder
- Use `select()`, not `selectRaw()` — CI4's Query Builder has no `selectRaw()` method.
- Use `$db->table()` or model query builder methods. Raw SQL goes in `$db->query()`.

### API Responses
- All JSON responses use **camelCase** field names.
- Formatting is done in the model/entity layer (or entity `__get` casts), not in the controller.
- Controllers return `$this->respond($data)` or `$this->failNotFound()` / `$this->failValidationErrors()` etc. via `ResponseTrait`.

### Soft Deletes
- Most models set `$useSoftDeletes = true` with a `deleted_at DATETIME NULL` column.
- Never use hard deletes unless the model explicitly omits soft-delete.

### Authentication
- Auth is JWT-based, validated via the `auth` helper in `SessionLibrary`.
- Instantiate in controller: `$this->session = new SessionLibrary();`
- Check auth: `$this->session->isAuth` (bool)
- Get current user: `$this->session->user` (returns `UserEntity | null`)
- User roles: `user`, `moderator`, `admin`
- **Token lifetime is intentionally long** (`auth.token.live`, currently 180 days) — logout does not shorten it. Instead, revocation is layered on top via `users.session_token`:
  - The JWT carries a `sid` claim = `users.session_token` at issuance time (`generateAuthToken($email, $sessionToken)`).
  - `validateAuthToken()` rejects the token if `sid` doesn't match the user's current `session_token` (or if it's `NULL`) — checked on every request, piggybacking on the user row `SessionLibrary` already loads (no extra query).
  - On login (`Auth::_serviceAuth()`, `Auth::verifyMagicLink()`), `Auth::ensureSessionToken()` generates a `session_token` only if the user doesn't already have one — logging in on a new device does **not** invalidate sessions already active elsewhere.
  - `POST /auth/logout` (`Auth::logout()`) clears `session_token` to `NULL`, instantly invalidating every token issued to that user, on every device, regardless of `exp`. The next login mints a fresh `session_token` and full-lifetime tokens work normally again.
  - `session_token` is never exposed in API responses — `Auth::responseAuth()` strips it from the returned user object the same way it strips `auth_type`/`role`.

### Bilingual Content
- Events and Objects store bilingual text as separate columns: `title_en`, `title_ru`, `content_en`, `content_ru`, etc. Event location (`location`, `address`, `latitude`, `longitude`, `min_age`) is single-language.
- Locale is resolved per-request via `LocaleLibrary`.

### Event Location & Map
- `events` columns: `location` (venue name), `address` (free-text), `latitude`/`longitude` (`DECIMAL(10,7)`, default the observatory's usual field), `min_age` (nullable), `end_date` (nullable).
- `address`/`latitude`/`longitude` (not `location`, `min_age`, or `end_date`) are stripped from the API response until the viewer has a booking for an *upcoming* event that `requires_registration` — see `EventsModel::isUpcoming()` and the gating in `Events::show()`/`Events::upcoming()`. `location` (the general venue name) is always public. Past events and no-registration events are never gated.
- No `yandex_map_link`/`google_map_link` columns anymore — the frontend generates map links on the fly from coordinates (`client/utils/maps.ts`).

### Language Files
- Located in `app/Language/en/` and `app/Language/ru/`.
- Files: `App.php`, `Auth.php`, `Categories.php`, `Comments.php`, `Events.php`, `General.php`, `Mailings.php`, `Members.php`, `Objects.php`, `Photos.php`, `Validation.php`.
- Load with: `lang('Events.someKey')` after `LocaleLibrary` sets the locale.

### Libraries (`app/Libraries/`)
| Library | Purpose |
|---|---|
| `SessionLibrary` | JWT validation, populates `$this->session->user` and `->isAuth` |
| `LocaleLibrary` | Sets CI4 locale from request header or user preference |
| `EmailLibrary` | Wraps CodeIgniter email service for mailing campaigns |
| `TelegramLibrary` | Sends Telegram notifications for event bookings |
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

### Filters (`app/Filters/`)
| Filter | Purpose |
|---|---|
| `RateLimitFilter` | Per-IP token-bucket throttling for abuse-prone public routes. Registered as alias `ratelimit` in `Config/Filters.php`; applied per-route via `['filter' => 'ratelimit:<bucket>,<capacity>,<seconds>']` (see route table above for current buckets). Disabled when `ENVIRONMENT === 'testing'` since the `file` cache backend is shared across test cases. Uses CI4's built-in `Services::throttler()`. |
| `CorsFilter` | Legacy/unused — superseded by CI4's built-in `Cors` filter (`Config\Cors`); left in place as a removal marker only. |

### UUIDs / IDs
- Most models use `$useAutoIncrement = false` with string/UUID PKs generated in `beforeInsert` callbacks.
- Exception: `ObservatoryEquipmentModel` uses auto-increment integer PK.

### Testing
- Always run `composer test` after any change.
- Tests live in `server/tests/` and use PHPUnit 11.5.
