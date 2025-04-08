<a id="top"></a>

A web application for a DIY amateur observatory with support for remote monitoring, equipment management, weather data, and an astrophoto archive. Developed using PHP, MySQL, Next.js, React, Redux RTK, SASS, and TypeScript. Please give the project a star :)

<!-- PROJECT TITLE -->
<div align="center">
  <img src="https://miksoft.pro/_next/static/media/observatory.b0a65576.jpg" alt="Homemade Observatory Web Application" width="150" height="150">
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

- [About of Project](#about-of-project)
    - [Key Features](#key-features)
    - [Built With](#built-with)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

<!-- ABOUT OF PROJECT -->
## About of Project

Amateur Astronomy Observatory Portal is a DIY platform for managing and monitoring a remote observatory. I wrote this app for my home observatory. The web app consists of several user screens, including displaying telemetry from the observatory, a weather station, storing processed astronomy photos, storing information about the captured frames. The app also features an interactive sky map, a deep sky image archive, and a live dashboard with weather and equipment statistics, the portal combines automation with practical astrophotography. Whether you are tracking celestial events or analyzing FITS footage, this project demonstrates the convergence of technology and astronomy.

<!-- KEY FEATURES -->
### Key Features:
- **Built with React and Next.js**: A fast and scalable web application for managing astronomical data.
- **Microservice Architecture**: Separates frontend and backend for efficient data processing and visualization.
- **Interactive Celestial Map**: Explore observed objects and their imaging history.
- **Real-Time Observatory Dashboard**: Monitor telescope status, weather conditions, and sensor data live.
- **Automated Data Processing**: FITS file management and astrophotography archive with detailed metadata.
- **Integrated Blog and Events**: Syncs with a Telegram channel for astronomy news and expedition reports.
- **Remote Observatory Control**: Manage equipment power and receive telemetry via an Arduino-based controller.

<p align="right">
  (<a href="#top">Back to top</a>)
</p>

### Built With

The Homemade Observatory Web Application project leverages a wide range of technologies across various layers of the system:

- [![PHP][php-badge]][php-url] Server-side scripting language for the backend API.
- [![MySQL][mysql-badge]][mysql-url] Database system for storing weather data.
- [![JavaScript][js-badge]][js-url] Core languages used in frontend development.
- [![TypeScript][ts-badge]][ts-url] TypeScript extends JavaScript by adding types to the language.
- [![NextJS][nextjs-badge]][nextjs-url] React-based frontend framework for building the user interface.
- [![Redux][redux-badge]][redux-url] State management for the frontend, providing predictable and centralized state.
- [![NodeJS][nodejs-badge]][nodejs-url] JavaScript runtime used for frontend development and package management.
- [![Sass][sass-badge]][sass-url] Styling the user interface.
- [![GitHub Actions][githubactions-badge]][githubactions-url] Continuous integration and deployment pipeline for automating tests and deployment processes.
- [![SonarCloud][sonarcloud-badge]][sonarcloud-url] Code quality and security analysis.

<p align="right">
  (<a href="#top">Back to top</a>)
</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open-source community an incredible environment for learning, inspiration, and innovation. Your contributions are highly valued and greatly appreciated, whether it’s reporting bugs, suggesting improvements, or creating new features.

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

<p align="right">
  (<a href="#top">Back to top</a>)
</p>

## License

<!-- LICENSE -->
Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<p align="right">
  (<a href="#top">Back to top</a>)
</p>

## Contact

Misha - [miksoft.pro](https://miksoft.pro)

<p align="right">
  (<a href="#top">Back to top</a>)
</p>

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
[license-url]: https://github.com/miksrv/astronomy-portal/blob/master/LICENSE.txt

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
