---
name: project-overview
description: Core facts about the astronomy-portal frontend project architecture and tech stack
type: project
---

Next.js 16 pages dir (NOT app dir), React 19, TypeScript 6.0 strict mode, Redux Toolkit + RTK Query, next-redux-wrapper for SSR hydration, next-i18next v16 for i18n (ru/en), Sass modules, echarts-for-react for charts, embla-carousel, yet-another-react-lightbox, simple-react-ui-kit component library.

**Why:** Understanding this helps avoid framework-wrong suggestions (e.g. no app-dir conventions, no server components).
**How to apply:** All pages use getServerSideProps + wrapper.getServerSideProps. State is managed via Redux store with HYDRATE. Styling is Sass modules. No Tailwind. Only one test file exists (coordinates.test.ts).

## i18n setup details

- Config: `client/next-i18next.config.js` — `defaultLocale: 'ru'`, `locales: ['ru', 'en']`, `defaultNS: 'translation'`, `localePath: ./public/locales`
- Translation files: `client/public/locales/{ru,en}/translation.json` — single namespace, dot-separated keys (e.g. `pages.about.title`)
- `_app.tsx` wraps with `appWithTranslation(App, i18Config)` — the second arg is required so pages without serverSideTranslations (like /404) still get a provider
- All pages call `serverSideTranslations(locale)` (no namespace arg needed — defaultNS is used)
- 404 page uses `getStaticProps` with `serverSideTranslations` (not `getServerSideProps`)
- `useTranslation`, `Trans`, `appWithTranslation` imported from `next-i18next/pages` (Pages Router path — v16 changed root export to App Router; all Pages Router imports must use `/pages` subpath)
- `serverSideTranslations` imported from `next-i18next/pages/serverSideTranslations`
- Key scanning: `i18next-scanner` via `yarn locales:build` — do NOT manually edit generated locale files; run scanner after adding new t() calls
- Locale persistence: stored in localStorage key `astro` under `locale` key; re-sync redirect happens in useEffect in _app.tsx (client-only)
