# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A DIY amateur observatory web application with remote monitoring, equipment control, weather data, astrophoto archive, stargazing events, and email mailings. The project is a monorepo with three subsystems: a Next.js frontend (`client/`), a CodeIgniter 4 PHP backend (`server/`), and Arduino firmware (`firmware/`).

**Current version:** 4.13.0 (see `CHANGELOG.md` for history)

**Feature specs:** `ROADMAP.md` lists planned features; each one with a spec is detailed in `features/`. A shipped feature's spec is deleted and the feature recorded in `CHANGELOG.md`.

### Domain rule: subscription = authentication

Stargazing events are rare (~3 per year), so the product's primary "dead-time" conversion is list-building, not booking. **There is no separate subscribe form/endpoint.** When a user authenticates via an OAuth service (Google/Yandex/VK), their email is persisted and they are **automatically subscribed** to the event mailing — they stay subscribed until they explicitly unsubscribe (`/unsubscribe`, `MailingUnsubscribes`). UX consequence:
- **Guest** → prompt to log in ("авторизуйтесь, чтобы получить письмо о ближайшем астровыезде") via the existing auth dialog (`openAuthDialog`).
- **Authenticated** → already subscribed; show reassurance (will be emailed) + Telegram as an extra channel, not a subscribe form.

### Maintenance rule: roles & permissions table

There is no central permission/filter middleware — every backend controller checks `session->can(Permission::X)` inline (`App\Enums\Permission`, a fixed backed enum), and the frontend mirrors those checks via `hasPermission()`/`hasAnyPermission()` (`client/utils/permissions.ts`) to show/hide pages and UI (see "User Roles & Permissions" in `README.md`). Roles (`user_roles` table, admin-editable via `/admin/roles`) are just named bundles of privileges a user can be assigned any number of; there is no admin bypass. Whenever a change touches who can do what — a new privilege is introduced, a privilege check is added/removed/loosened/tightened on either the backend or the frontend, a seeded role's default privileges change — **update the "User Roles & Permissions" tables in `README.md` in the same change**. That section is the single source of truth for the access matrix; letting it drift from the code makes it actively misleading.

## Development Commands

### Frontend (`client/`)

```bash
yarn install
yarn dev              # Dev server at http://localhost:3000
yarn build            # Production build (standalone output)
yarn test             # Run Jest tests
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
php spark db:seed CategoriesSeeder   # Seeders: Categories, ObservatoryEquipment, ObservatorySettings
composer routes       # List all API routes
```

### Database

```bash
cd config
docker-compose up     # Start MariaDB at localhost:3308 (db: db, user: user, pass: password)
```

## Architecture

Detailed inventories live next to the code — read them instead of guessing:
- **`client/CLAUDE.md`** — frontend conventions, API error handling, verification checklist.
- **`client/DESIGN.md`** — design system (tokens, type roles, layout, patterns); read it before any UI change.
- **`server/CLAUDE.md`** — full API route table, controllers, models, libraries, notable migrations, CLI commands, backend conventions.

### Frontend (`client/`)

**Stack:** Next.js 16.4.3 (pages router), React 19.3.1, TypeScript 6.0.3, Redux RTK 2.13.x (RTK Query in `client/api/`), SASS, i18next 26.x. Yarn 4.9.2, Node.js ≥ 20.11.0. Built as Next.js standalone.

**Path alias:** `@/*` maps to the `client/` root (e.g., `@/api/models/photo`).

**i18n:** Locales live in `client/public/locales/{en,ru}/` — `translation.json` plus per-page namespaces. `yarn locales:build` (i18next-scanner) adds new keys with the Russian default; the EN value of a new key, and both values of a changed key, are then filled in by hand.

**UI library:** `simple-react-ui-kit` 2.x (tokens `theme.css` + component `styles.css`, imported once in `pages/_app.tsx`). The site is dark-only (`data-theme="dark"` on `<html>`). Always prefer kit components over native HTML (`Button`, `Input`, `TextArea`, `Message`, `Table`, …); when to use `Container` and the rest of the layout rules are in `client/DESIGN.md`.

**Star map:** d3-celestial + D3 are vanilla JS in `client/public/scripts/` (not npm), loaded lazily only where `<StarMap>` renders. Astronomy math uses `astronomy-engine` + `suncalc` (`client/utils/coordinates.ts`); charts use ECharts via `echarts-for-react`; the event map uses `leaflet` (dynamically imported, `ssr: false`).

**Coding conventions (frontend):**
- Component props must use `interface`, not `type` alias
- Default text in `t('key', 'fallback')` must always be **Russian**
- Every new i18n key must be added to **both** `client/public/locales/en/translation.json` and `client/public/locales/ru/translation.json` with proper translations — never copy English text into the RU file

### Backend (`server/`)

**Stack:** CodeIgniter 4.7, PHP 8.2 (pinned as `config.platform.php` in `composer.json`, so `composer update` never resolves packages the hosting cannot run). JWT auth via `firebase/php-jwt ^7` (requires an HS256 secret of at least 32 bytes — `auth.token.secret`). Web Push via `minishlink/web-push ^11` (+ `guzzlehttp/guzzle`), ticket QR codes via `endroid/qr-code ^6`. Tests via PHPUnit 11.5 on in-memory SQLite.

**Routing:** all routes in `server/app/Config/Routes.php` (autoRoute disabled); every group also registers `OPTIONS (:any)` for CORS preflight. `composer routes` lists them.

**Payments:** `PaymentLibrary` + `PaymentGatewayInterface` are gateway-agnostic — adding a provider means one class implementing the interface; `AlfaBankClient` is the current one.

**Backend conventions:**
- API responses use **camelCase** field names (e.g. `createdAt`, not `created_at`) — format in model, not controller
- Errors use the `{message, errors?}` envelope via `BaseApiController` helpers — see "API Responses" in `server/CLAUDE.md`
- CodeIgniter 4 Query Builder does **not** have `selectRaw()` — use `select()` which accepts raw SQL expressions and aliases natively
- `CommentsModel::getForEntity()` and `getRandom()` return author as `{ id, name, avatar }` object with name truncated to "FirstName L." for privacy
- Always run migrations after pulling changes that add them

**Rate limiting:** `server/app/Filters/RateLimitFilter.php` (alias `ratelimit`) throttles abuse-prone public routes per-IP via a token bucket (CI4's `Services::throttler()`), applied per-route in `Routes.php` — currently OAuth login, `relay/light`, `events/booking`, `comments` create, `mailings/:id/test`, `push-notifications/:id/test`, and `push/subscribe`. Disabled under `ENVIRONMENT === 'testing'`.

**Session revocation:** The JWT lifetime is intentionally long (180 days) and unchanged by logout. Instead, `users.session_token` is embedded in every token as a `sid` claim and checked on every request; `POST /auth/logout` clears it, instantly invalidating every token issued to that user on any device — see "Authentication" in `server/CLAUDE.md` for the full mechanism.

### Firmware (`firmware/`)

Arduino/embedded firmware for observatory hardware control (relay boards, sensors). Source in `firmware/main/`.

### Deployment

- **Frontend:** SSH/rsync to VPS, served via PM2 (`ecosystem.config.js`). Built as Next.js standalone (`output: 'standalone'` in `next.config.js`).
- **Backend:** FTP upload to shared PHP hosting via GitHub Actions.
- CI/CD workflows in `.github/workflows/`:
  - `ui-checks.yml` — runs on PRs: lint + test + build
  - `api-checks.yml` — runs on PRs: PHPUnit tests
  - `ui-deploy.yml` — deploys frontend on push to `main`
  - `api-deploy.yml` — deploys backend on push to `main`
  - `sonarcloud.yml` — SonarCloud quality gate on PRs and pushes to `main`
