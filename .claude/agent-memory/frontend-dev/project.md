---
name: project-overview
description: Frontend framework gotchas — pages router only, next-i18next v16 /pages import subpath
type: project
---

Stack and conventions are in the root `CLAUDE.md`, `client/CLAUDE.md` and `client/DESIGN.md`. Not written there:

- Pages router only (no app dir, no server components); SSR state goes through `next-redux-wrapper` (`wrapper.getServerSideProps`/`getStaticProps`, HYDRATE). Static pages: see [[static-pages-use-getstaticprops-via-wrapper]].
- next-i18next v16 moved its root export to the App Router: import `useTranslation`/`Trans`/`appWithTranslation` from `next-i18next/pages` and `serverSideTranslations` from `next-i18next/pages/serverSideTranslations`.
- `_app.tsx` passes the config as the second arg of `appWithTranslation(App, i18Config)` so pages without `serverSideTranslations` still get a provider.
