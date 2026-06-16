# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A DIY amateur observatory web application with remote monitoring, equipment control, weather data, astrophoto archive, stargazing events, and email mailings. The project is a monorepo with three subsystems: a Next.js frontend (`client/`), a CodeIgniter 4 PHP backend (`server/`), and Arduino firmware (`firmware/`).

**Current version:** 4.5.5 (see `CHANGELOG.md` for history)

### Domain rule: subscription = authentication

Stargazing events are rare (~3 per year), so the product's primary "dead-time" conversion is list-building, not booking. **There is no separate subscribe form/endpoint.** When a user authenticates via an OAuth service (Google/Yandex/VK), their email is persisted and they are **automatically subscribed** to the event mailing — they stay subscribed until they explicitly unsubscribe (`/unsubscribe`, `MailingUnsubscribes`). UX consequence:
- **Guest** → prompt to log in ("авторизуйтесь, чтобы получить письмо о ближайшем астровыезде") via the existing auth dialog (`openAuthDialog`).
- **Authenticated** → already subscribed; show reassurance (will be emailed) + Telegram as an extra channel, not a subscribe form.

## Development Commands

### Frontend (`client/`)

```bash
yarn install
yarn dev              # Dev server at http://localhost:3000
yarn build            # Production build (standalone output)
yarn test             # Run Jest tests
yarn test:watch       # Jest in watch mode
yarn eslint:check     # Check linting
yarn eslint:fix       # Auto-fix lint issues
yarn prettier:check   # Check formatting
yarn prettier:fix     # Auto-format code
yarn locales:build    # Regenerate i18n translation files
```

### Backend (`server/`)

```bash
composer install
composer serve        # Dev server at http://localhost:8080 (upload limit: 70MB)
composer test         # Run PHPUnit tests
composer migration:run       # Run pending migrations
composer migration:rollback  # Rollback last migration
composer migration:status    # Check migration status
composer migration:create    # Create new migration
composer seed:run     # Run database seeders (SettingsUserRelaySeeder)
composer routes       # List all API routes
```

### Database

```bash
cd config
docker-compose up     # Start MariaDB at localhost:3308 (db: db, user: user, pass: password)
```

## Architecture

### Frontend (`client/`)

**Stack:** Next.js 16.2.6, React 19.2.6, TypeScript 6.0.3, Redux RTK 2.11.x, SASS, i18next 26.x. Package manager: Yarn 4.9.2. Node.js ≥ 20.11.0 required.

**Routing:** Pages-router (`client/pages/`). Key routes:
- `/` — main dashboard
- `/about` — about page with donators list
- `/auth` — authentication
- `/profile` — user profile
- `/users` — users list
- `/objects`, `/objects/[name]`, `/objects/form` — astronomical objects catalog + create/edit form
- `/observatory`, `/observatory/overview`, `/observatory/weather`, `/observatory/history`, `/observatory/history/[slug]` — observatory monitoring + history
- `/photos`, `/photos/[name]`, `/photos/form` — astrophoto archive + upload/edit form
- `/stargazing`, `/stargazing/[name]`, `/stargazing/[name]/statistic`, `/stargazing/checkin`, `/stargazing/entry`, `/stargazing/faq`, `/stargazing/form`, `/stargazing/history`, `/stargazing/howto`, `/stargazing/rules`, `/stargazing/tickets`, `/stargazing/where` — stargazing events
- `/mailing`, `/mailing/form`, `/mailing/[id]` — email mailing campaigns
- `/unsubscribe` — mailing unsubscribe landing
- `/starmap` — interactive star map
- `/sitemap.tsx` — sitemap generation

**API layer:** RTK Query in `client/api/api.ts` (main API) and `client/api/apiMeteo.ts` (weather/meteo data). Store configured in `client/api/store.ts`; shared constants in `client/api/constants.ts`. Auto-generated hooks consumed throughout. Auth state in `client/api/authSlice.ts`. App-wide state in `client/api/applicationSlice.ts`.

**Data models:** TypeScript interfaces in `client/api/models/` (category, comment, equipment, event, file, filters, mailing, object, photo, relay, sitemap, statistic, user, weather). Per-endpoint request/response types in `client/api/types/` (auth, category, comments, equipment, events, files, mailings, objects, photos, relay, sitemap, statistic, users, weather).

**Components:** Organized as `client/components/common/`, `client/components/pages/` (about, index, objects, observatory, photos, profile, stargazing, users), `client/components/ui/` (breadcrumbs, carousel, counter, pagination, show-more, user-avatar), and `client/components/icons/`.

Notable `common/` components: `app-layout/` (with `app-header`), `app-footer/`, `app-toolbar/`, `login-form/`, `moon-phase-icon/`, `object-photos-table/`, `photo-filter-list/`, `photo-gallery/`, `photo-lightbox/`, `prev-next-nav/`, `star-map/`, `visibility-chart/`, plus reviews:
- `review-card/` — displays a single review with author avatar, star rating, text, date, delete button
- `review-form/` — form to submit a review (star selector + TextArea + submit); shows API validation errors inline

**Utils:** `client/utils/` — coordinates.ts (celestial math), charts.ts, colors.ts, dates.ts, errors.ts, helpers.ts, moon.ts, pagination.ts, photos.ts, strings.ts, eventPhotos.ts, localstorage.ts, constants.ts. Most have a corresponding `.test.ts`.

**Path alias:** `@/*` maps to the `client/` root (e.g., `@/api/models/photo`).

**i18n:** Translation files are auto-generated via `yarn locales:build` (i18next-scanner). Locales live in `client/public/locales/{en,ru}/` — `translation.json` plus per-page namespaces (`observatory-overview`, `stargazing-faq`, `stargazing-howto`, `stargazing-rules`, `stargazing-where`). Do not manually edit generated locale files.

**Other notable deps:** `html5-qrcode` + `react-qr-code` (event check-in QR codes), `react-markdown` (rich text), `react-photo-album` + `yet-another-react-lightbox` (galleries), `next-seo` (SEO/JSON-LD), `dayjs` (dates), `sharp` (image processing), `cookies-next`.

**Star map:** Uses Celestial.js + D3.js loaded via `client/public/scripts/`. These are vanilla JS libraries, not npm packages.

**Astronomy calculations:** `astronomy-engine` and `suncalc` packages power visibility charts and celestial coordinate utilities in `client/utils/coordinates.ts`.

**Charts:** Apache ECharts via `echarts-for-react` for weather and statistics visualizations.

**Carousel:** `embla-carousel-react` for photo slideshows.

**UI library:** `simple-react-ui-kit` (internal component library). Always prefer its components over native HTML — use `Button` not `<button>`, `TextArea` not `<textarea>`, `Input` not `<input>`, `Container` for card sections, `Message` for alerts, `Table` for tabular data.

**Coding conventions (frontend):**
- Component props must use `interface`, not `type` alias
- Default text in `t('key', 'fallback')` must always be **Russian**
- Every new i18n key must be added to **both** `client/public/locales/en/translation.json` and `client/public/locales/ru/translation.json` with proper translations — never copy English text into the RU file

### Backend (`server/`)

**Stack:** CodeIgniter 4.6, PHP 8.2. JWT auth via `firebase/php-jwt ^6.10`. Telegram Bot via `longman/telegram-bot ^0.83.1`. Tests via PHPUnit 11.5 (with `fakerphp/faker`, `mikey179/vfsstream`).

**Routing:** All routes in `server/app/Config/Routes.php` (autoRoute disabled). Every route group also registers `OPTIONS (:any)` for CORS preflight. API endpoints:
- `GET /` — health check (`{name, version, status}`)
- `GET /camera/:num` — camera image data
- `GET /statistic/telescope` — telescope statistics
- `GET /auth/me`, `GET /auth/google`, `GET /auth/yandex`, `GET /auth/vk` — OAuth authentication; `PATCH /auth/profile` — update profile
- `GET /relay/list`, `GET /relay/light`, `PUT /relay/set` — power relay control
- `GET /files/:any` — file serving
- `GET /equipments`, `GET /categories` — equipment and categories
- `GET|POST|PATCH|DELETE /objects`, `/objects/:any` — astronomical objects CRUD
- `GET /fits/:any` — FITS file data (`Fits::show`)
- `GET|POST|PATCH|DELETE /photos`, `/photos/:any` + `POST /photos/:any/upload` — astrophoto CRUD + upload
- `GET|POST|PATCH|DELETE /events` + `upcoming`, `upcoming/registered`, `photos`, `:id/statistic`, `members/:id`, `checkin/:id`, `:id/cover`, `booking`, `cancel`, `upload/:id` — stargazing events
- `GET|POST|PATCH|DELETE /mailings`, `/mailings/:id` + `unsubscribe`, `audiences`, `:id/upload`, `:id/test`, `:id/send` — email mailing campaigns
- `GET /members`, `GET /members/:id/events` — members list and their events
- `GET /comments?entityType=&entityId=` — list comments (adds `canReview`+`hasReviewed` for authenticated event requests)
- `GET /comments/random?entityType=&limit=` — random comments for widget
- `POST /comments` — create review (auth required)
- `DELETE /comments/:id` — soft-delete review (own or admin/mod)
- `GET /sitemap` — sitemap data

**Controllers** (`server/app/Controllers/`): Auth, Camera, Categories, Comments, Equipment, Events, Files, Mailings, Members, Objects, Photos, Relay, Sitemap, Statistic.

**Models:** `server/app/Models/ApplicationBaseModel.php` is the shared base; all models extend it. Entity classes in `server/app/Entities/` map to DB rows. Models cover: Users, Photos, PhotosAuthor, PhotosCategory, PhotosEquipments, PhotosFilters, PhotosObject, Objects, ObjectCategory, ObjectFitsFiles, ObjectFitsFilters, ObservatoryEquipment, ObservatorySettings, Events, EventsPhotos, EventsUsers, Category, Comments, Mailings, MailingEmails, MailingUnsubscribes.

**Backend conventions:**
- API responses use **camelCase** field names (e.g. `createdAt`, not `created_at`) — format in model, not controller
- CodeIgniter 4 Query Builder does **not** have `selectRaw()` — use `select()` which accepts raw SQL expressions and aliases natively
- `CommentsModel::getForEntity()` and `getRandom()` return author as `{ id, name, avatar }` object with name truncated to "FirstName L." for privacy

**Libraries** (`server/app/Libraries/`): CatalogLibrary (FITS), EmailLibrary, GoogleClient/YandexClient/VkClient (OAuth), LocaleLibrary, PhotosLibrary, PhotoUploadLibrary, RelayLibrary (Arduino comms), SessionLibrary (JWT validation), StatisticLibrary, TelegramLibrary.

**Migrations & seeders:** Migrations in `server/app/Database/Migrations/` (schema spans Oct 2024 → Apr 2026; latest add `comments` table and `photos.views`). Seeders in `server/app/Database/Seeds/`: CategoriesSeeder, ObservatoryEquipmentSeeder, ObservatorySettingsSeeder. Always run migrations after pulling changes that add them.

**CORS:** Configured in `server/app/Config/Cors.php`.

### Firmware (`firmware/`)

Arduino/embedded firmware for observatory hardware control (relay boards, sensors). Source in `firmware/main/`.

### Deployment

- **Frontend:** SSH/rsync to VPS, served via PM2 (`ecosystem.config.js`). Built as Next.js standalone (`output: 'standalone'` in `next.config.js`).
- **Backend:** FTP upload to shared PHP hosting via GitHub Actions.
- CI/CD workflows in `.github/workflows/`:
  - `ui-checks.yml` — runs on PRs: lint + test + build
  - `ui-deploy.yml` — deploys frontend on push to `main`
  - `api-deploy.yml` — deploys backend on push to `main`
  - `sonarcloud.yml` — SonarCloud quality gate on PRs and pushes to `main`
