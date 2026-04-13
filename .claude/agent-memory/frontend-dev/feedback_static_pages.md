---
name: Static pages use getStaticProps via wrapper
description: Pages with no dynamic data should use wrapper.getStaticProps with revalidate:86400
type: feedback
---

Fully static pages (no per-request data fetching) use `wrapper.getStaticProps` from `next-redux-wrapper`, not `getServerSideProps`. The wrapper supports both patterns.

**Why:** `getServerSideProps` renders on every request, wasting server time for pages whose content never changes between deploys. ISR (`revalidate: 86400`) refreshes them daily.

**How to apply:** When a page only calls `serverSideTranslations` and `store.dispatch(setLocale(locale))` in its data-fetching function, convert it to `wrapper.getStaticProps` with `revalidate: 86400`. Import `GetStaticPropsContext` instead of `GetServerSidePropsContext`. Confirmed working — build output shows `●` (SSG) for about, faq, howto, rules, where pages.
