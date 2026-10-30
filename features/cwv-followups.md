# FEAT-29 — Core Web Vitals Follow-ups

**Status:** Planned
**Priority:** Medium
**Affects:** Frontend (Next.js) + `simple-react-ui-kit` (sibling repo)

The first Core Web Vitals pass shipped in 4.14.0: the `sideEffects` fix that stopped the `@/components/common` barrel from shipping on every page, the lazy lightbox, auth dialog and review form, `sizes`/`preload` on LCP images, WebP hero backgrounds, the CLS fixes and leaner `__NEXT_DATA__`. Initial JS went from ~350 to ~237 KB gzip per page. This spec collects what was left for later.

How to measure: production build against the prod API on `:3100`, `yarn next analyze export --route <route>` for per-package initial JS, Lighthouse in mobile mode, and a puppeteer `layout-shift` observer with `client/.next/cache/images` cleared (warm caches hide CLS).

---

## 1. Split `translation.json` into namespaces

`client/public/locales/{ru,en}/translation.json` is ~105 KB on disk, ~56 KB minified per locale, and is inlined into every page's `__NEXT_DATA__`. Because of it Next.js still warns about large page data on `/404`, `/about`, `/privacy` and the `/stargazing/*` info pages (141–165 KB).

- Move page- and section-specific keys (`pages.*`, `components.pages.<page>.*`) into per-page namespaces, the way `stargazing-faq`, `observatory-overview` and others already work. Keep only shared keys (menu, common, app layout, footer, cookie banner, auth dialog) in `translation`.
- Each page passes its namespaces to `initSSRLocale` (the default is now `['translation']`).
- Check `i18next-scanner.config.js` so `yarn locales:build` writes keys to the right namespace.

## 2. Tree-shakeable `simple-react-ui-kit`

The kit ships as one `dist/index.esm.js`, so every page downloads all of it (~29 KB gzip) whatever it uses.

- In the kit repo (`/Users/mik/Developer/projects/simple-react-ui-kit`), build with preserved modules (one file per component) and keep accurate `sideEffects` (CSS only).
- Alternatively or additionally, add the kit to `experimental.optimizePackageImports` in `client/next.config.js` once the per-module build exists.

## 3. Shared CSS chunk

Turbopack (pages router) merges the CSS modules of all pages into one render-blocking chunk (~17 KB gzip). Every page loads styles for unrelated pages (admin, mailing, objects forms, the star map).

- Look into whether Turbopack has a CSS chunking option for the pages router in Next 16, or whether moving admin-only and heavy page styles behind dynamic imports splits them out.
- Re-measure the critical CSS size per route afterwards.

## 4. Trim the `/objects` photo payload

`pages/objects/index.tsx` passes the full `photosList` (~99 KB) as props only to show object cover thumbnails. Pass a minimal map instead (object name → cover file fields), either shaped in `getServerSideProps` or through a dedicated lightweight endpoint.

## 5. "Read more" shift on the event page

`ShowMore` (`client/components/ui/show-more/`) renders the "Читать полностью" toggle until the text is measured, then removes it when the text fits. On desktop this leaves a small layout shift (~0.013, below the 0.1 threshold) on `/stargazing/[id]`. Options: hide the toggle with `visibility: hidden` while keeping its space, or decide the overflow on the server from the text length.

## Acceptance Criteria

- [ ] No "large page data" warnings in `yarn build` for the static info pages
- [ ] Initial JS on `/404` drops below the 4.14.0 baseline (~208 KB gzip); the kit is no longer included whole
- [ ] Critical CSS on a typical public page contains no admin or unrelated page styles
- [ ] `/objects` `__NEXT_DATA__` is well under the 4.14.0 size (~190 KB)
- [ ] CLS is 0 on `/stargazing/[id]` on desktop
- [ ] Lighthouse mobile scores do not regress on `/`, `/stargazing`, `/photos`, `/about`, `/observatory/weather`, `/starmap`
