# Local Setup & Configuration

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.11.0 |
| Yarn | 4.9.2 |
| PHP | ≥ 8.2 |
| Composer | ≥ 2.x |
| Docker & Docker Compose | any recent version |

## Database

The project uses MariaDB. Start a local instance via Docker Compose:

```bash
cd config
docker-compose up -d
```

This starts a MariaDB 10.5.8 container accessible at `localhost:3308` with:
- **Database:** `db`
- **User:** `user`
- **Password:** `password`

## Backend Setup

```bash
cd server

# Install PHP dependencies
composer install

# Copy environment file and configure it
cp env .env

# Run database migrations
composer migration:run

# (Optional) seed initial data
php spark db:seed CategoriesSeeder
php spark db:seed ObservatoryEquipmentSeeder
php spark db:seed ObservatorySettingsSeeder

# Start development server at http://localhost:8080
composer serve
```

## Frontend Setup

```bash
cd client

# Install Node.js dependencies
yarn install

# Copy environment file and configure it
cp env .env

# Start development server at http://localhost:3000
yarn dev
```

To build for production:

```bash
yarn build
```

## Configuration

### Frontend (`client/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_LINK` | Public URL of the frontend | `http://localhost:3000/` |
| `NEXT_PUBLIC_API_HOST` | Backend API base URL | `http://localhost:8080/` |
| `NEXT_PUBLIC_IMG_HOST` | Base URL for serving uploaded images (optional, defaults to `NEXT_PUBLIC_API_HOST`) | `http://localhost:8080/` |
| `NEXT_PUBLIC_LAT` | Observatory latitude (for sky map) | `0.0` |
| `NEXT_PUBLIC_LON` | Observatory longitude (for sky map) | `0.0` |
| `NEXT_PUBLIC_THUNDERFOREST_API_KEY` | Tile API key for the event location map | — |

### Backend (`server/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `CI_ENVIRONMENT` | App environment (`development` / `production`) | `development` |
| `app.baseURL` | Backend base URL | `http://localhost:8080/` |
| `app.appTimezone` | Server timezone | `UTC` |
| `app.latitude` | Observatory latitude | `0.0` |
| `app.longitude` | Observatory longitude | `0.0` |
| `astrometry.apiKey` | nova.astrometry.net API key for plate solving photos: new uploads are solved from the editor's browser, the archive once with `php spark photos:solve --all` (see server/CLAUDE.md CLI Commands). Shown on https://nova.astrometry.net/profile after signing in | — |
| `app.observatory.controller` | Base URL of the observatory power relay API | — |
| `app.observatory.controller.user` / `.password` | Power relay API credentials | — |
| `observatory.agentToken` | Bearer token of the observatory agent (FEAT-30), ≥ 32 random bytes (`openssl rand -hex 32`); the same value goes into the agent's token file | — |
| `app.observatory.webcam_1` | Webcam 1 snapshot URL | — |
| `app.observatory.webcam_2` | Webcam 2 snapshot URL | — |
| `app.siteUrl` | Public frontend URL; used to build the payment return URL | `https://astro.miksoft.pro` |
| `auth.token.secret` | JWT HS256 secret, **at least 32 bytes** | — |
| `auth.token.live` | JWT lifetime in seconds | `15552000` |
| `auth.google.*` | Google OAuth credentials | — |
| `auth.yandex.*` | Yandex OAuth credentials | — |
| `auth.vk.*` | VK OAuth credentials | — |
| `payment.gateway` | Active acquiring gateway implementation | `alfabank` |
| `payment.currency` | ISO 4217 numeric currency code (`810` = RUB) | `810` |
| `payment.sessionTimeoutSecs` | Order lifetime / unpaid seat-hold TTL, in seconds | `1200` |
| `payment.alfabank.environment` | `'test'` to use the `payment.alfabank.test.*` block below, anything else uses production | `production` |
| `payment.alfabank.userName` | Alfa-Bank API login (usually ends with `-api`) | — |
| `payment.alfabank.password` | Alfa-Bank API password | — |
| `payment.alfabank.token` | Payment token; preferred over `userName`/`password` when set (required for an "r-login" contract). Not used by `refund.do`, which always needs `userName`/`password` | — |
| `payment.alfabank.gatewayUrl` | Alfa-Bank REST base URL (production) | `https://payment.alfabank.ru/payment/rest/` |
| `payment.alfabank.callbackToken` | Symmetric token for HMAC callback verification | — |
| `payment.alfabank.test.*` | Same keys as above (`userName`/`password`/`token`/`gatewayUrl`/`callbackToken`), used when `payment.alfabank.environment = 'test'` | `gatewayUrl`: `https://alfa.rbsuat.com/payment/rest/` |
| `smtp.*` | SMTP server for mailings, tickets and magic links (`host`/`port`/`user`/`pass`/`crypto`/`mail`/`senderName`) | — |
| `push.vapidPublicKey` / `vapidPrivateKey` / `vapidSubject` | VAPID keys for Web Push | — |
| `database.*.hostname` | DB host | `127.0.0.1` |
| `database.*.port` | DB port | `3308` |
| `database.*.database` | DB name | `db` |
| `database.*.username` | DB user | `user` |
| `database.*.password` | DB password | `password` |
