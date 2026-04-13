# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A DIY amateur observatory web application with remote monitoring, equipment control, weather data, and astrophoto archive. The project is a monorepo with three subsystems: a Next.js frontend (`client/`), a CodeIgniter 4 PHP backend (`server/`), and Arduino firmware (`firmware/`).

**Current version:** 4.1.5 (see `CHANGELOG.md` for history)

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

**Stack:** Next.js 16.1.6, React 19.2.4, TypeScript 5.9.3, Redux RTK 2.x, SASS, i18next. Package manager: Yarn 4.9.2. Node.js ≥ 20.11.0 required.

**Routing:** Pages-router (`client/pages/`). Key routes:
- `/` — main dashboard
- `/about` — about page with donators list
- `/auth` — authentication
- `/objects`, `/objects/[name]` — astronomical objects catalog
- `/observatory`, `/observatory/overview`, `/observatory/weather` — observatory monitoring
- `/photos`, `/photos/[name]` — astrophoto archive
- `/stargazing`, `/stargazing/[name]`, `/stargazing/checkin`, `/stargazing/entry`, `/stargazing/faq`, `/stargazing/form`, `/stargazing/howto`, `/stargazing/rules`, `/stargazing/where` — stargazing events
- `/starmap` — interactive star map
- `/sitemap.tsx` — sitemap generation

**API layer:** RTK Query in `client/api/api.ts` (main API) and `client/api/apiMeteo.ts` (weather/meteo data). Auto-generated hooks consumed throughout. Auth state in `client/api/authSlice.ts`. App-wide state in `client/api/applicationSlice.ts`.

**Data models:** TypeScript interfaces in `client/api/models/` (author, category, equipment, event, file, filter, object, photo, relay, statistic, user, weather). Additional shared interfaces in `client/api/types/`.

**Components:** Organized as `client/components/common/`, `client/components/pages/` (about, index, objects, observatory, photos, stargazing), `client/components/ui/` (breadcrumbs, carousel, counter, show-more).

**Utils:** `client/utils/` — coordinates.ts (celestial math), colors.ts, dates.ts, helpers.ts, moon.ts, photos.ts, strings.ts, eventPhotos.ts, localstorage.ts, constants.ts. Each has a corresponding `.test.ts`.

**Path alias:** `@/*` maps to the `client/` root (e.g., `@/api/models/photo`).

**i18n:** Translation files are auto-generated via `yarn locales:build`. Do not manually edit generated locale files.

**Star map:** Uses Celestial.js + D3.js loaded via `client/public/scripts/`. These are vanilla JS libraries, not npm packages.

**Astronomy calculations:** `astronomy-engine` and `suncalc` packages power visibility charts and celestial coordinate utilities in `client/utils/coordinates.ts`.

**Charts:** Apache ECharts via `echarts-for-react` for weather and statistics visualizations.

**Carousel:** `embla-carousel-react` for photo slideshows.

**UI library:** `simple-react-ui-kit` (internal component library).

### Backend (`server/`)

**Stack:** CodeIgniter 4.6, PHP 8.2. JWT auth via `firebase/php-jwt ^6.10`. Telegram Bot via `longman/telegram-bot ^0.83.1`. Tests via PHPUnit 11.5.

**Routing:** All routes in `server/app/Config/Routes.php`. API endpoints:
- `GET /system/recalculate/fits` — recalculate FITS filters
- `GET /camera/:id` — camera data
- `GET /statistic/telescope` — telescope statistics
- `GET /auth/me`, `GET /auth/google`, `GET /auth/yandex`, `GET /auth/vk` — OAuth authentication
- `GET /relay/list`, `GET /relay/light`, `PUT /relay/set` — power relay control
- `GET /files/:path` — file serving
- `GET /equipments`, `GET /categories` — equipment and categories
- `GET|POST|PATCH|DELETE /objects/:name` — astronomical objects CRUD
- `GET /fits/:name` — FITS file data
- `GET|POST|PATCH|DELETE /photos` — astrophoto CRUD + upload
- `GET|POST|PATCH /events` + booking/cancel/checkin/members/upload/photos/upcoming — stargazing events
- `GET /sitemap` — sitemap data

**Controllers:** Auth, Author, Camera, Categories, Equipment, Events, Files, Objects, Photos, Relay, Sitemap, Statistic, System (in `server/app/Controllers/`).

**Models:** `server/app/Models/ApplicationBaseModel.php` is the shared base. All models extend it. Entity classes in `server/app/Entities/` map to DB rows. Models cover: Users, Photos, PhotosAuthors, PhotosCategories, PhotosEquipments, PhotosFilters, PhotosObjects, Objects, ObjectCategories, ObjectFitsFiles, ObjectFitsFilters, ObservatoryEquipment, ObservatorySettings, Events, EventsPhotos, EventsUsers.

**Migrations:** In `server/app/Database/Migrations/`. Always run migrations after pulling changes that add them.

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
