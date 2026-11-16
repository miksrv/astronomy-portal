# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A DIY amateur observatory web application with remote monitoring, equipment control, weather data, astrophoto archive, stargazing events, and email mailings. The project is a monorepo with three subsystems: a Next.js frontend (`client/`), a CodeIgniter 4 PHP backend (`server/`), and the observatory PC setup (`observatory/`).

**Version:** `client/package.json`; history in `CHANGELOG.md`.

**Feature specs:** `ROADMAP.md` lists planned features; each one with a spec is detailed in `features/`. A shipped feature's spec is deleted and the feature recorded in `CHANGELOG.md`.

### Domain rule: subscription = authentication

Stargazing events are rare (~3 per year), so the product's primary "dead-time" conversion is list-building, not booking. **There is no separate subscribe form/endpoint.** When a user authenticates via an OAuth service (Google/Yandex/VK), their email is persisted and they are **automatically subscribed** to the event mailing — they stay subscribed until they explicitly unsubscribe (`/unsubscribe`, `MailingUnsubscribes`). UX consequence:
- **Guest** → prompt to log in ("авторизуйтесь, чтобы получить письмо о ближайшем астровыезде") via the existing auth dialog (`openAuthDialog`).
- **Authenticated** → already subscribed; show reassurance (will be emailed) + Telegram as an extra channel, not a subscribe form.

### Maintenance rule: roles & permissions table

There is no central permission/filter middleware — every backend controller checks `session->can(Permission::X)` inline (`App\Enums\Permission`, a fixed backed enum), and the frontend mirrors those checks via `hasPermission()`/`hasAnyPermission()` (`client/utils/permissions.ts`) to show/hide pages and UI (see `docs/permissions.md`). Roles (`user_roles` table, admin-editable via `/admin/roles`) are just named bundles of privileges a user can be assigned any number of; there is no admin bypass. Whenever a change touches who can do what — a new privilege is introduced, a privilege check is added/removed/loosened/tightened on either the backend or the frontend, a seeded role's default privileges change — **update the tables in `docs/permissions.md` in the same change**. That document is the single source of truth for the access matrix; letting it drift from the code makes it actively misleading.

### Feature flag: telescope jobs (FEAT-30 phase 2)

Built, but switched off until it is presented: `TELESCOPE_JOBS_ENABLED = false` in `client/utils/constants.ts` hides the UI, and the `/telescope/*` route group is commented out in `server/app/Config/Routes.php`. Switch both on together.

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
- **`server/CLAUDE.md`** — stack, full API route table, controllers, models, libraries (payments, plate solving, the agent sync), auth and session revocation, rate limiting, notable migrations, CLI commands, backend conventions.
- **`docs/`** — local setup and every env variable (`setup.md`), CI/CD and deployment (`deployment.md`), the access matrix (`permissions.md`).

### Frontend (`client/`)

**Stack:** Next.js 16.4.3 (pages router), React 19.3.1, TypeScript 6.0.3, Redux RTK 2.13.x (RTK Query in `client/api/`), SASS, i18next 26.x. Yarn 4.9.2, Node.js ≥ 20.11.0. Built as Next.js standalone.

**Path alias:** `@/*` maps to the `client/` root (e.g., `@/api/models/photo`).

**i18n:** Locales live in `client/public/locales/{en,ru}/`. The scanner-managed dictionary is split by section — `translation.json` (shared: `common.*`, `menu.*`, `components.common.*`, `components.ui.*`, the small pages) plus `stargazing`, `objects`, `photos`, `observatory`, `starmap`, `admin`, `about`, `privacy` (key prefix → namespace in `NAMESPACE_PREFIXES`, `client/i18next-scanner.config.js`); the hand-written page namespaces (`stargazing-faq`, `observatory-overview`, …) are read via `useTranslation('<ns>')`. Keys keep their names in code (`t('pages.photos.title')`): i18next falls back from `translation` into the loaded section namespaces (`fallbackNS`), so a page only has to load what its section needs — `initSSRLocale(store, context, ['translation', 'photos'])` / `requirePermissionSSR(..., ['translation', 'admin'])`. A key used by several sections belongs in `common.*`. `yarn locales:build` (i18next-scanner) adds new keys with the Russian default to the right file; the EN value of a new key, and both values of a changed key, are then filled in by hand.

**UI library:** `simple-react-ui-kit` 2.x (tokens `theme.css` + component `styles.css`, imported once in `pages/_app.tsx`). The site is dark-only (`data-theme="dark"` on `<html>`). Always prefer kit components over native HTML (`Button`, `Input`, `TextArea`, `Message`, `Table`, …); when to use `Container` and the rest of the layout rules are in `client/DESIGN.md`.

**Star map:** d3-celestial + D3 are vanilla JS in `client/public/scripts/` (not npm), loaded lazily only where `<StarMap>` renders. Astronomy math uses `astronomy-engine` + `suncalc` (`client/utils/coordinates.ts`); charts use ECharts via `echarts-for-react`; the event map uses `leaflet` (dynamically imported, `ssr: false`).

**Coding conventions (frontend):**
- Component props must use `interface`, not `type` alias
- Default text in `t('key', 'fallback')` must always be **Russian**
- Every new i18n key must be added to **both** the `en` and `ru` locale files (the section's namespace file) with proper translations — never copy English text into the RU file

### Backend (`server/`)

CodeIgniter 4.7 on PHP 8.2, tests on in-memory SQLite. Conventions that bite most often (the rest in `server/CLAUDE.md`):
- API responses use **camelCase** field names, formatted in the model, not the controller
- Errors use the `{message, errors?}` envelope via the `BaseApiController` helpers
- CI4's Query Builder has **no** `selectRaw()` — `select()` takes raw expressions and aliases
- Every route is declared in `server/app/Config/Routes.php` (autoRoute disabled)

### Observatory (`observatory/`)

Docs (English), anonymised INDI driver configs, indiweb/Ekos profiles, the KStars desktop container, the power scripts of the observatory PC `astrolab` and the Python agent `observatory/agent/` — enough to rebuild it from scratch (`observatory/README.md`). Never commit credentials, public addresses or site coordinates there: use placeholders (`change-me`, `example.com`, `0.0`). Safety rules for anything that can move the roof or mount are in `observatory/docs/safety.md`.

### Deployment

Pushing to `main` deploys both sides (frontend: rsync to a VPS + PM2; backend: FTP to shared PHP hosting); PRs run lint, tests, build and SonarCloud. Migrations are **not** run by the deploy. Details: `docs/deployment.md`.
