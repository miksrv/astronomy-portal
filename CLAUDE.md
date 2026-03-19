# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A DIY amateur observatory web application with remote monitoring, equipment control, weather data, and astrophoto archive. The project is a monorepo with two separate subsystems: a Next.js frontend (`client/`) and a CodeIgniter 4 PHP backend (`server/`).

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
composer serve        # Dev server at http://localhost:8080
composer test         # Run PHPUnit tests
composer migration:run       # Run pending migrations
composer migration:rollback  # Rollback last migration
composer migration:status    # Check migration status
composer migration:create    # Create new migration
composer seed:run     # Run database seeders
composer routes       # List all API routes
```

### Database

```bash
cd config
docker-compose up     # Start MariaDB at localhost:3308 (db: db, user: user, pass: password)
```

## Architecture

### Frontend (`client/`)

Next.js 16 with TypeScript, Redux RTK for state management, SASS for styling, and i18next for internationalization (multi-language support).

**Routing:** Pages-router (`client/pages/`). Each `.tsx` file maps to a route.

**API layer:** RTK Query (`client/api/api.ts`) for all backend communication. Each endpoint is defined there and consumed via auto-generated hooks. Auth state is in `client/api/authSlice.ts`.

**Data models:** TypeScript interfaces in `client/api/models/` mirror backend entities. The `client/api/types/` directory contains additional shared interfaces.

**Path alias:** `@/*` maps to the `client/` root (e.g., `@/api/models/photo`).

**i18n:** Translation files are auto-generated via `yarn locales:build`. Do not manually edit generated locale files.

**Star map:** Uses Celestial.js + D3.js loaded via `client/public/scripts/`. These are vanilla JS libraries, not npm packages.

**Astronomy calculations:** `astronomy-engine` and `suncalc` packages power visibility charts and celestial coordinate utilities in `client/utils/coordinates.ts`.

### Backend (`server/`)

CodeIgniter 4 (PHP 8.2) REST API. JWT-based authentication via Firebase JWT. Telegram Bot integration for event syncing.

**Routing:** All routes defined in `server/app/Config/Routes.php`. Controllers in `server/app/Controllers/` handle endpoints directly.

**Models:** `server/app/Models/ApplicationBaseModel.php` is the shared base. All models extend it. Entity classes in `server/app/Entities/` map to DB rows.

**Migrations:** In `server/app/Database/Migrations/`. Always run migrations after pulling changes that add them.

**CORS:** Configured in `server/app/Config/Cors.php`.

### Deployment

- **Frontend:** SSH/rsync to VPS, served via PM2 (`ecosystem.config.js`). Built as Next.js standalone (`output: 'standalone'` in `next.config.js`).
- **Backend:** FTP upload to shared PHP hosting via GitHub Actions.
- CI/CD: GitHub Actions workflows in `.github/workflows/` — `ui-checks.yml` runs on PRs (lint + test + build), `ui-deploy.yml` and `api-deploy.yml` deploy on push to `main`.
