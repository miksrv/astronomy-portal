# server/CLAUDE.md

Backend-specific reference for the CodeIgniter 4 PHP API. For project-wide context, dev commands, and deployment see the root `CLAUDE.md`.

## API Routes (`app/Config/Routes.php`)

```
GET  /                              → API health info (inline closure)

GET  /camera/:id                    → Camera::show

GET  /statistic/telescope           → Statistic::telescope

GET  /auth/me                       → Auth::me
GET  /auth/google                   → Auth::google
GET  /auth/yandex                   → Auth::yandex
GET  /auth/vk                       → Auth::vk

GET  /relay/list                    → Relay::list
GET  /relay/light                   → Relay::light
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
GET    /events/photos               → Events::photos
GET    /events/:id                  → Events::show
GET    /events/members/:id          → Events::members
GET    /events/checkin/:id          → Events::checkin
POST   /events                      → Events::create
PATCH  /events/:id                  → Events::update
DELETE /events/:id                  → Events::delete
POST   /events/:id/cover            → Events::cover
POST   /events/booking              → Events::booking
POST   /events/cancel               → Events::cancel
POST   /events/upload/:id           → Events::upload

GET    /mailings                    → Mailings::list
POST   /mailings                    → Mailings::create
GET    /mailings/unsubscribe        → Mailings::unsubscribe  (public; declared before (:alphanum))
GET    /mailings/:id                → Mailings::show
PATCH  /mailings/:id                → Mailings::update
DELETE /mailings/:id                → Mailings::delete
POST   /mailings/:id/upload         → Mailings::upload
POST   /mailings/:id/test           → Mailings::test
POST   /mailings/:id/send           → Mailings::send

GET  /members                       → Members::list
GET  /members/:id/events            → Members::events

GET    /comments                    → Comments::index
GET    /comments/random             → Comments::random
POST   /comments                    → Comments::create
DELETE /comments/:id                → Comments::delete

GET  /sitemap                       → Sitemap::index
```

All groups also register `OPTIONS (:any)` for CORS preflight.

---

## Controllers (`app/Controllers/`)

All controllers extend `ResourceController` and use the `ResponseTrait`.

| File | Description |
|---|---|
| `Auth.php` | OAuth login via Google, Yandex, VK; JWT issuance; `GET /auth/me` session check |
| `Camera.php` | Returns camera image data by numeric ID (short cache TTL) |
| `Categories.php` | Lists photo/object categories (read-only, locale-aware) |
| `Comments.php` | CRUD for user comments/reviews on events and photos; soft-delete, auth required for write |
| `Equipment.php` | Lists observatory equipment (read-only) |
| `Events.php` | Full CRUD for stargazing events; booking, cancellation, check-in, photo uploads, Telegram notifications |
| `Files.php` | Serves raw files (FITS thumbnails, etc.) associated with astronomical objects |
| `Mailings.php` | Admin mailing campaign CRUD; test send and bulk send via `EmailLibrary` |
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
| `UsersModel.php` | `users` | yes | `UserEntity`; roles: `user`, `moderator`, `admin`; UUID PKs |
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
| `2026-04-16-100000_AddPhotosViews` | ALTER `photos` — adds `views INT` column |
| `2026-04-16-110000_AddComments` | `comments` |

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

### Bilingual Content
- Events and Objects store bilingual text as separate columns: `title_en`, `title_ru`, `content_en`, `content_ru`, `location_en`, `location_ru`, etc.
- Locale is resolved per-request via `LocaleLibrary`.

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

### UUIDs / IDs
- Most models use `$useAutoIncrement = false` with string/UUID PKs generated in `beforeInsert` callbacks.
- Exception: `ObservatoryEquipmentModel` uses auto-increment integer PK.

### Testing
- Always run `composer test` after any change.
- Tests live in `server/tests/` and use PHPUnit 11.5.
