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

## About

A DIY platform for a remote amateur observatory: live observatory and weather dashboard, deep-sky photo archive with plate solving, interactive star map, and stargazing events with ticketing. Demo: [astro.miksoft.pro](https://astro.miksoft.pro).

### Features

- **Observatory dashboard** — weather, imaging statistics, equipment, webcam, power control.
- **Astrophoto archive** — photos with FITS metadata, filters, equipment and plate-solved coordinate grids.
- **Interactive star map** — observed objects, constellations and imaging history (d3-celestial).
- **Stargazing events** — registration, paid tickets (Alfa-Bank), QR check-in, reviews, photo/video gallery.
- **Accounts** — Google / Yandex / VK or e-mail magic link; mailings and Web Push about upcoming events.
- **Role-based admin** — admin-editable roles built from a fixed privilege catalog.
- **Russian and English UI.**

### Built With

[![PHP][php-badge]][php-url] [![MySQL][mysql-badge]][mysql-url] [![TypeScript][ts-badge]][ts-url] [![NextJS][nextjs-badge]][nextjs-url] [![Redux][redux-badge]][redux-url] [![NodeJS][nodejs-badge]][nodejs-url] [![Sass][sass-badge]][sass-url] [![GitHub Actions][githubactions-badge]][githubactions-url] [![SonarCloud][sonarcloud-badge]][sonarcloud-url]

Next.js 16 (pages router) + React 19 + Redux Toolkit / RTK Query on the frontend, CodeIgniter 4 (PHP 8.2) + MariaDB on the backend.

---

## Project Structure

```
astronomy-portal/
├── client/        # Next.js frontend
├── server/        # CodeIgniter 4 backend API
├── observatory/   # The observatory PC: docs, INDI/Ekos configs, scripts
├── docs/          # Project documentation
└── config/        # Docker Compose (local MariaDB) and nginx config
```

## Quick Start

```bash
(cd config && docker-compose up -d)                       # MariaDB on localhost:3308
(cd server && composer install && cp env .env && composer migration:run && composer serve)   # API on :8080
(cd client && yarn install && cp env .env && yarn dev)    # site on :3000
```

Details and every environment variable: [docs/setup.md](docs/setup.md).

## Documentation

| Document | Contents |
|---|---|
| [docs/setup.md](docs/setup.md) | Prerequisites, local setup, environment variables |
| [docs/deployment.md](docs/deployment.md) | CI/CD, maintenance mode, migrations, payment acquiring |
| [docs/permissions.md](docs/permissions.md) | Privileges, roles and the access matrix |
| [observatory/README.md](observatory/README.md) | The observatory itself: hardware, INDI/Ekos, safety, rebuilding the observatory PC |
| [server/CLAUDE.md](server/CLAUDE.md) | API routes, controllers, models, backend conventions |
| [client/CLAUDE.md](client/CLAUDE.md), [client/DESIGN.md](client/DESIGN.md) | Frontend conventions and design system |
| [ROADMAP.md](ROADMAP.md), [CHANGELOG.md](CHANGELOG.md) | Planned features and release history |

## Contributing

Fork the repo, create a branch (`git checkout -b feature/my-feature`), commit, and open a pull request. Bug reports and ideas are welcome in [issues][issues-url].

## License

Distributed under the MIT License. See [LICENSE](LICENSE).

## Contact

Misha — [miksoft.pro](https://miksoft.pro)

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
