<a id="top"></a>

A web application for a DIY amateur observatory with support for remote monitoring, equipment management, weather data, and an astrophoto archive. Developed using PHP, MariaDB, Next.js, React, Redux RTK, SASS, and TypeScript. Please give the project a star :)

<!-- PROJECT TITLE -->
<div align="center">
  <img src="https://miksoft.pro/images/observatory.webp" alt="Homemade Observatory Web Application" width="150" height="150">
  <h3>Homemade Observatory Web Application</h3>
  <a href="CHANGELOG.md" target="_blank">Changelog</a>
  ·
  <a href="https://astro.miksoft.pro" target="_blank">Demo</a>
  ·
  <a href="#contact">Contact</a>
</div>

<br />

<!-- PROJECT BADGES -->
<div align="center">

[![Contributors][contributors-badge]][contributors-url]
[![Forks][forks-badge]][forks-url]
[![Stargazers][stars-badge]][stars-url]
[![Issues][issues-badge]][issues-url]
[![MIT License][license-badge]][license-url]

[![UI Checks](https://github.com/miksrv/astronomy-portal/actions/workflows/ui-checks.yml/badge.svg)](https://github.com/miksrv/astronomy-portal/actions/workflows/ui-checks.yml)
[![UI Deploy](https://github.com/miksrv/astronomy-portal/actions/workflows/ui-deploy.yml/badge.svg)](https://github.com/miksrv/astronomy-portal/actions/workflows/ui-deploy.yml)
[![API Deploy](https://github.com/miksrv/astronomy-portal/actions/workflows/api-deploy.yml/badge.svg)](https://github.com/miksrv/astronomy-portal/actions/workflows/api-deploy.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=miksrv_astronomy-portal&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=miksrv_astronomy-portal)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=miksrv_astronomy-portal&metric=coverage)](https://sonarcloud.io/summary/new_code?id=miksrv_astronomy-portal)

</div>

---

<!-- TABLE OF CONTENTS -->
### Table of Contents

- [About the Project](#about-the-project)
    - [Key Features](#key-features)
    - [Built With](#built-with)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Database](#database)
    - [Backend Setup](#backend-setup)
    - [Frontend Setup](#frontend-setup)
- [Configuration](#configuration)
    - [Frontend Environment Variables](#frontend-environment-variables)
    - [Backend Environment Variables](#backend-environment-variables)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

<!-- ABOUT THE PROJECT -->
## About the Project

Amateur Astronomy Observatory Portal is a DIY platform for managing and monitoring a remote observatory. The web app consists of several user screens, including displaying telemetry from the observatory, a weather station, storing processed astronomy photos, and storing information about captured frames. The app also features an interactive sky map, a deep sky image archive, and a live dashboard with weather and equipment statistics. The portal combines automation with practical astrophotography. Whether you are tracking celestial events or analyzing FITS footage, this project demonstrates the convergence of technology and astronomy.

<!-- KEY FEATURES -->
### Key Features

- **Built with React and Next.js** — a fast and scalable web application for managing astronomical data.
- **Interactive Celestial Map** — explore observed objects, constellations, stars, and their imaging history powered by Celestial.js and D3.js.
- **Real-Time Observatory Dashboard** — monitor telescope status, weather conditions, and sensor data live.
- **Astrophotography Archive** — FITS file management and astrophotography archive with detailed metadata, equipment info, and filters.
- **Stargazing Events** — event management with registration, check-in via QR code, and photo upload.
- **Astronomy Calculations** — visibility charts, celestial coordinate utilities, moon phase display using `astronomy-engine` and `suncalc`.
- **Remote Observatory Control** — manage equipment power and receive telemetry via an Arduino-based controller.
- **OAuth Authentication** — sign in with Google, Yandex, or VK accounts.
- **Telegram Integration** — astronomy news and expedition reports synced with a Telegram channel.
- **Multilingual UI** — i18n support via `i18next`.

<p align="right">(<a href="#top">Back to top</a>)</p>

---

### Built With

The Homemade Observatory Web Application project leverages a wide range of technologies across various layers of the system:

- [![PHP][php-badge]][php-url] Server-side scripting language (PHP 8.2) powering the CodeIgniter 4 backend API.
- [![MySQL][mysql-badge]][mysql-url] MariaDB/MySQL database system for storing all application data.
- [![JavaScript][js-badge]][js-url] Core language used in frontend development.
- [![TypeScript][ts-badge]][ts-url] TypeScript extends JavaScript by adding types to the language (v5.9.3).
- [![NextJS][nextjs-badge]][nextjs-url] React-based frontend framework for building the user interface (v16.1.6).
- [![Redux][redux-badge]][redux-url] State management for the frontend via Redux Toolkit with RTK Query.
- [![NodeJS][nodejs-badge]][nodejs-url] JavaScript runtime used for frontend development and package management (≥20.11.0).
- [![Sass][sass-badge]][sass-url] Styling the user interface.
- [![GitHub Actions][githubactions-badge]][githubactions-url] Continuous integration and deployment pipeline for automating tests and deployment processes.
- [![SonarCloud][sonarcloud-badge]][sonarcloud-url] Code quality and security analysis.

<p align="right">(<a href="#top">Back to top</a>)</p>

---

<!-- PROJECT STRUCTURE -->
## Project Structure

This is a monorepo with three independent subsystems:

```
astronomy-portal/
├── client/              # Next.js 16 frontend application
│   ├── api/             # RTK Query API layer and data models
│   ├── components/      # React UI components
│   ├── pages/           # Next.js pages-router (routes)
│   ├── public/          # Static assets, star map data, images
│   └── utils/           # Utility functions (coordinates, dates, moon, etc.)
├── server/              # CodeIgniter 4 PHP backend API
│   └── app/
│       ├── Controllers/ # Request handlers (Auth, Photos, Events, Objects…)
│       ├── Models/      # Database models extending ApplicationBaseModel
│       ├── Entities/    # DB row entity classes
│       ├── Database/
│       │   └── Migrations/ # Database migrations
│       ├── Config/      # Routes, CORS, Filters, Services
│       └── Libraries/   # JWT, Telegram, Locale helpers
├── firmware/            # Arduino firmware for observatory hardware control
│   └── main/
└── config/              # Docker Compose and Nginx configuration
```

<p align="right">(<a href="#top">Back to top</a>)</p>

---

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20.11.0 |
| Yarn | 4.9.2 |
| PHP | ≥ 8.2 |
| Composer | ≥ 2.x |
| Docker & Docker Compose | any recent version |

---

### Database

The project uses MariaDB. Start a local instance via Docker Compose:

```bash
cd config
docker-compose up -d
```

This starts a MariaDB 10.5.8 container accessible at `localhost:3308` with:
- **Database:** `db`
- **User:** `user`
- **Password:** `password`

---

### Backend Setup

```bash
cd server

# Install PHP dependencies
composer install

# Copy environment file and configure it
cp .env.example .env

# Run database migrations
composer migration:run

# (Optional) seed initial data
composer seed:run

# Start development server at http://localhost:8080
composer serve
```

---

### Frontend Setup

```bash
cd client

# Install Node.js dependencies
yarn install

# Copy environment file and configure it
cp .env.example .env

# Start development server at http://localhost:3000
yarn dev
```

To build for production:

```bash
yarn build
```

<p align="right">(<a href="#top">Back to top</a>)</p>

---

<!-- CONFIGURATION -->
## Configuration

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SITE_LINK` | Public URL of the frontend | `http://localhost:3000/` |
| `NEXT_PUBLIC_API_HOST` | Backend API base URL | `http://localhost:8080/` |
| `NEXT_PUBLIC_IMG_HOST` | Base URL for serving uploaded images | `http://localhost:8080/` |
| `NEXT_PUBLIC_LAT` | Observatory latitude (for sky map) | `51.7` |
| `NEXT_PUBLIC_LON` | Observatory longitude (for sky map) | `55.2` |

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CI_ENVIRONMENT` | App environment (`development` / `production`) | `development` |
| `app.baseURL` | Backend base URL | `http://localhost:8080/` |
| `app.appTimezone` | Server timezone | `Asia/Yekaterinburg` |
| `app.latitude` | Observatory latitude | `51.7727` |
| `app.longitude` | Observatory longitude | `55.0988` |
| `app.fitsApiKey` | API key for FITS data source | — |
| `app.telegramBotKey` | Telegram bot token | — |
| `app.telegramChatID` | Telegram channel/chat ID | — |
| `app.observatory.controller` | URL of Arduino relay controller | `http://astro.myftp.org:8081/` |
| `app.observatory.webcam_1` | Webcam 1 snapshot URL | — |
| `app.observatory.webcam_2` | Webcam 2 snapshot URL | — |
| `auth.token.secret` | JWT secret key | — |
| `auth.token.live` | JWT lifetime in seconds | `1209600` |
| `auth.google.*` | Google OAuth credentials | — |
| `auth.yandex.*` | Yandex OAuth credentials | — |
| `auth.vk.*` | VK OAuth credentials | — |
| `database.*.hostname` | DB host | `127.0.0.1` |
| `database.*.port` | DB port | `3308` |
| `database.*.database` | DB name | `db` |
| `database.*.username` | DB user | `user` |
| `database.*.password` | DB password | `password` |

<p align="right">(<a href="#top">Back to top</a>)</p>

---

<!-- API OVERVIEW -->
## API Overview

All backend endpoints are defined in `server/app/Config/Routes.php`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/me` | Current authenticated user info |
| `GET` | `/auth/google` | OAuth via Google |
| `GET` | `/auth/yandex` | OAuth via Yandex |
| `GET` | `/auth/vk` | OAuth via VK |
| `GET` | `/equipments` | Observatory equipment list |
| `GET` | `/categories` | Photo categories list |
| `GET\|POST\|PATCH\|DELETE` | `/objects/:name` | Astronomical objects CRUD |
| `GET` | `/fits/:name` | FITS file data for an object |
| `GET\|POST\|PATCH\|DELETE` | `/photos` | Astrophoto archive CRUD + upload |
| `GET\|POST\|PATCH` | `/events` | Stargazing events management |
| `POST` | `/events/booking` | Book a place at an event |
| `POST` | `/events/cancel` | Cancel booking |
| `POST` | `/events/checkin` | QR check-in |
| `GET` | `/events/members` | Event member list |
| `GET` | `/events/upcoming` | Upcoming events |
| `GET` | `/relay/list` | Relay devices list |
| `GET` | `/relay/light` | Observatory light status |
| `PUT` | `/relay/set` | Set relay state |
| `GET` | `/statistic/telescope` | Telescope usage statistics |
| `GET` | `/files/:path` | File serving |
| `GET` | `/sitemap` | Sitemap data |
| `GET` | `/system/recalculate/fits` | Recalculate FITS filters |

<p align="right">(<a href="#top">Back to top</a>)</p>

---

<!-- DEPLOYMENT -->
## Deployment

CI/CD is handled by GitHub Actions (`.github/workflows/`):

| Workflow | Trigger | Action |
|----------|---------|--------|
| `ui-checks.yml` | Pull Request | Lint + test + build frontend |
| `ui-deploy.yml` | Push to `main` | Deploy frontend via SSH/rsync to VPS, served with PM2 |
| `api-deploy.yml` | Push to `main` | Deploy backend via FTP to shared PHP hosting |
| `sonarcloud.yml` | PRs + push to `main` | SonarCloud quality gate |

The frontend is built as a Next.js standalone app (`output: 'standalone'` in `next.config.js`) and managed by PM2 (`ecosystem.config.js`).

<p align="right">(<a href="#top">Back to top</a>)</p>

---

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open-source community an incredible environment for learning, inspiration, and innovation. Your contributions are highly valued and greatly appreciated, whether it's reporting bugs, suggesting improvements, or creating new features.

**To contribute:**

1. Fork the project by clicking the "Fork" button at the top of this page.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/miksrv/astronomy-portal.git
   ```
3. Create a new feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
4. Make your changes, then commit them:
   ```bash
   git commit -m "Add AmazingFeature"
   ```
5. Push your changes to your forked repository:
   ```bash
   git push origin feature/AmazingFeature
   ```
6. Open a pull request from your feature branch to the main repository.

We encourage contributions of all kinds, whether big or small. Your efforts help improve the project for everyone!

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## License

<!-- LICENSE -->
Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<p align="right">(<a href="#top">Back to top</a>)</p>

---

## Contact

Misha - [miksoft.pro](https://miksoft.pro)

<p align="right">(<a href="#top">Back to top</a>)</p>

---

<!-- MARKDOWN VARIABLES (LINKS, IMAGES) -->
[contributors-badge]: https://img.shields.io/github/contributors/miksrv/astronomy-portal.svg?style=for-the-badge
[contributors-url]: https://github.com/miksrv/astronomy-portal/graphs/contributors
[forks-badge]: https://img.shields.io/github/forks/miksrv/astronomy-portal.svg?style=for-the-badge
[forks-url]: https://github.com/miksrv/astronomy-portal/network/members
[stars-badge]: https://img.shields.io/github/stars/miksrv/astronomy-portal.svg?style=for-the-badge
[stars-url]: https://github.com/miksrv/astronomy-portal/stargazers
[issues-badge]: https://img.shields.io/github/issues/miksrv/astronomy-portal.svg?style=for-the-badge
[issues-url]: https://github.com/miksrv/astronomy-portal/issues
[license-badge]: https://img.shields.io/github/license/miksrv/astronomy-portal.svg?style=for-the-badge
[license-url]: https://github.com/miksrv/astronomy-portal/blob/main/LICENSE.txt

<!-- Other ready-made icons can be seen for example here: https://github.com/inttter/md-badges -->
[js-badge]: https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000
[js-url]: https://www.javascript.com/
[ts-badge]: https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff
[ts-url]: https://www.typescriptlang.org/
[nextjs-badge]: https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white
[nextjs-url]: https://nextjs.org/
[nodejs-badge]: https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white
[nodejs-url]: https://nodejs.org/
[redux-badge]: https://img.shields.io/badge/Redux-764ABC?logo=redux&logoColor=fff
[redux-url]: https://redux.js.org/
[sass-badge]: https://img.shields.io/badge/Sass-C69?logo=sass&logoColor=fff
[sass-url]: https://sass-lang.com/
[php-badge]: https://img.shields.io/badge/php-%23777BB4.svg?&logo=php&logoColor=white
[php-url]: https://www.php.net/
[mysql-badge]: https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=fff
[mysql-url]: https://www.mysql.com/
[sonarcloud-badge]: https://img.shields.io/badge/SonarCloud-F3702A?logo=sonarcloud&logoColor=fff
[sonarcloud-url]: https://sonarcloud.io/
[githubactions-badge]: https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white
[githubactions-url]: https://docs.github.com/en/actions
