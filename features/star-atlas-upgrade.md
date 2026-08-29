# FEAT-27 — Star Atlas Upgrade (`/starmap` Planetarium Mode)

**Status:** Planned
**Priority:** Medium
**Affects:** Frontend (Next.js) + Backend (CodeIgniter 4, one small proxy endpoint)
**Parallel implementation:** Mostly frontend-only; the one backend piece (location search proxy) is a small, independent endpoint that can land before, after, or in parallel with the frontend work — the frontend can ship the geolocation/date UI without it and add the "search a city" affordance once it exists.

---

## Overview

`/starmap` receives real organic traffic for queries like "звездное небо онлайн", "карта звездного неба онлайн" and "карта звездного неба онлайн бесплатно", but the tool behind that traffic is a fairly plain equatorial star chart, not the "look up at your own sky right now" experience those queries actually want (compare [stellarium-web.org](https://stellarium-web.org/)). This spec closes that gap **without replacing the rendering engine**.

**Why not swap to Stellarium Web Engine (the actual engine behind stellarium-web.org):** it's a WebGL/WASM planetarium engine, but it's dual-licensed **AGPL-3.0 / commercial** — embedding it in this MIT-licensed project (`LICENSE`) would either force this repo (or at least the served frontend) to comply with AGPL's network-use source-disclosure clause, or require paying for a commercial license from Stellarium Labs. Neither is worth it for what's actually missing. Aladin Lite v3 (CDS Strasbourg) was also considered — permissively licensed and lightweight, but it's a real-sky-imagery/catalog viewer (HiPS surveys), not a stylized planetarium chart, so it doesn't solve the actual gap either.

**What's actually missing** is already native, shipped functionality in the current dependency, [d3-celestial](https://github.com/ofrohn/d3-celestial) v0.7.35 (`client/public/scripts/celestial.min.js`) — it's just never turned on:

- `client/components/common/star-map/config.ts:212` hardcodes `projection: 'mercator'` and `transform: 'equatorial'` — d3-celestial also supports a horizon-based (`transform: 'horizontal'`) planetarium view with `horizon.show`/`daylight.show` (`config.ts:44-47,117-124`), currently forced to `false`.
- `config.ts:116,283` hardcodes `geopos: [51.82, 55.17]` (the observatory's coordinates) — there is no real geolocation, no location search, and (per `StarMapRender.tsx`) no code path ever calls d3-celestial's date/location API at all, so the map is permanently frozen on "now, from the observatory."
- There is no search box, no full DSO catalog option (only the curated `dsos.bright.json`, `config.ts:50`), and no shareable "this is the view I found" link.
- `client/public/scripts/{d3,d3.geo.projection,celestial}.min.js` (~835 KB uncompressed) load `beforeInteractive` for **every page on the site** (`client/pages/_app.tsx:71-82`), not just the pages that render `<StarMap>`.
- `client/pages/starmap.tsx:29-37` points `openGraph.images` at `/screenshots/starmap.jpg`, which does not exist anywhere in the repo — social shares and search rich-previews get a broken image.
- `starmap.tsx:25-28`'s description talks about the astrophoto archive ("галактики, туманности, кометы... снятых любительским телескопом"), not about the atlas tool itself — it's answering the wrong search intent for the keywords actually driving traffic here.
- No unit/component tests exist for the `star-map` module at all (confirmed: no `*.test.*` files under `client/components/common/star-map/`), unlike the rest of the codebase's per-util test convention.

This is complementary to, not a duplicate of, **FEAT-9 ("What's Visible Tonight" Planner)**: FEAT-9 is a separate planning UI (a list of tonight's visible objects); this spec gives the map itself the date/time + location engine that a "tonight" feature would eventually want to reuse. FEAT-9 stays independently scoped and out of this spec.

**Two concrete workflows this spec is designed around** (both driven by the same "pick a place + a moment in time, then screenshot it" pattern):

1. **"Where will the Moon be, how low, what phase, for city X at time Y?"** — used today to post to a Telegram channel. Needs: location + date/time controls (FE-2), a horizon-style view so "how low" reads visually (FE-3), and a click-for-info panel giving phase/illumination/altitude/azimuth in numbers, not just a picture (FE-11).
2. **"Where's the radiant of a meteor shower, with compass directions, so I can frame a screenshot and post about it?"** — needs the horizon view with cardinal-direction labels (FE-3) and a radiant layer for known showers (FE-12).

Neither needs Stellarium Web Engine's actual per-location photographic landscapes — d3-celestial's own horizon/daylight rendering plus a stylized ground silhouette gets the same "compass + horizon, screenshot-ready" result, and the position/phase/rise-set math is already solved elsewhere in this codebase by `astronomy-engine`/`suncalc` (`client/utils/moon.ts`, `client/components/pages/observatory/astronomy-calc/utils.ts`, `client/components/common/visibility-chart/utils.ts`) — this spec reuses that, it doesn't reinvent it.

---

## Business Rules

1. **Stay on d3-celestial — no engine swap.** Every new capability below is either already built into d3-celestial (horizon/planetarium mode, alternate projections) or a thin layer around it (search, permalink). This keeps the project MIT-clean and avoids a WASM build pipeline (emscripten/SCons) the project has no other reason to take on.
2. **The existing equatorial map view is the default and keeps working exactly as it does today**, including existing saved `localStorage` settings (`STARMAP_STORAGE_KEY`, `client/components/common/star-map/constants.ts:15`) — the new horizon/planetarium view is an additional mode the user opts into, not a replacement. `loadStarMapSettings()`'s existing `{ ...DEFAULT_STARMAP_SETTINGS, ...parsed }` merge (`utils.ts:104-119`) already makes new `StarMapSettings` fields backward-compatible with old saved payloads for free.
3. **Geolocation degrades gracefully.** Default flow: try `navigator.geolocation.getCurrentPosition()` once on first visit → on grant, use it; on denial/timeout/unsupported browser, fall back to today's hardcoded `defaultConfig.geopos` (`config.ts:116`) exactly as now. A user is never blocked or nagged — one permission prompt, then silent fallback.
4. **Location search never calls a third-party geocoder directly from the browser.** Every other external integration in this codebase (Google/Yandex/VK OAuth, Alfa-Bank payments) is proxied through a backend `Library` class using `Config\Services::curlrequest()` (see `GoogleClient.php`, `AlfaBankClient.php`) — location search follows the same shape, both to respect the geocoder's usage policy (identifiable server-side requests) and for consistency.
5. **The full DSO catalog is opt-in, never the default.** The default stays the small curated `dsos.bright.json` — a visitor arriving from a Google search on mobile/4G should not pay for a bigger catalog than the default view needs. The full `dsos.6.json` (already present in `client/public/data/`, currently unused) is fetched lazily only when a user explicitly turns on a "more objects" toggle.
6. **Celestial/D3 scripts load only on pages that actually render `<StarMap>`.** Today they load `beforeInteractive` for the entire site (`_app.tsx:71-82`); every page that never mounts the map (home, admin, mailings, stargazing, etc.) is paying ~835 KB it doesn't use.
7. **Every new interactive control follows the existing i18n convention** — Russian fallback text in `t('key', 'Текст')`, new keys added to both `client/public/locales/en/translation.json` and `client/public/locales/ru/translation.json`.
8. **SEO copy is rewritten to match the actual search intent** driving traffic to this page (the atlas tool itself), not the astrophoto archive — this is a content change to `starmap.tsx`'s title/description/on-page copy, not just a technical fix.
9. **The horizon-mode ground is a stylized generic silhouette (hills/treeline), not a geo-accurate landscape.** Real per-location photographic panoramas are Stellarium's actual "landscapes" feature and require real engine/asset support this project isn't taking on (Business Rule 1) — a generic dark silhouette at the horizon edge gives the same "compass + horizon, screenshot-ready" read without that.
10. **Object info (altitude/azimuth, Moon phase, rise/set) is computed independently of d3-celestial**, via the project's existing `astronomy-engine`/`suncalc` utilities, from the clicked object's RA/Dec plus FE-2's resolved location+date. This decouples the info panel from whatever internal projection math d3-celestial happens to use for rendering, and reuses code that already exists and is already tested elsewhere in the codebase rather than duplicating astronomy math a second way.
11. **Meteor shower radiants are a small static, rarely-changing catalog** (radiant coordinates + active date windows barely change year to year, per the IMO working list of visual meteor showers) — bundled as a JSON asset alongside the existing star/DSO catalogs (`client/public/data/`), no database table, no admin CRUD, no backend endpoint.

---

## Backend Tasks

### BE-1 — `GeocodeClient` library + `Geocode` controller

**New files:** `server/app/Libraries/GeocodeClient.php`, `server/app/Controllers/Geocode.php`
**Route:** `server/app/Config/Routes.php` — new top-level group, following the existing group style (specific literal paths, `OPTIONS` handler, rate-limited sensitive route):

```php
$routes->group('geocode', static function ($routes) {
    $routes->get('/', 'Geocode::search', ['filter' => 'ratelimit:geocode_search,20,60']);
    $routes->options('/', static function () {});
});
```

`GeocodeClient` mirrors `AlfaBankClient`'s `CURLRequest` setup (`AlfaBankClient.php:61-66`) — explicit `timeout`/`connect_timeout` (CI4's default is unbounded, per the comment already in that file), `$getShared = false`, and the same `try/catch (\Throwable $e) { log_message('error', ...); return null; }` pattern used in `AlfaBankClient::request()` / `GoogleClient::authUser()`. Calls a geocoding provider (e.g. OpenStreetMap Nominatim's `/search` endpoint) with an identifying `User-Agent`/`Referer` per that provider's usage policy, and `accept-language` set from the request's locale (mirrors `LocaleLibrary`'s existing locale resolution).

`Geocode::search()`:
- Query param `q` (free-text place name), required, min length guard (reject 1-character queries rather than proxying them).
- Response cached via `Config\Services::cache()` (file handler, same as `Objects::list()`/`Equipment::list()`), keyed by `'geocode_' . md5(strtolower(trim($q)) . '_' . $locale)`, TTL on the order of a day — place names don't change, and this both protects the upstream provider's rate limit and keeps repeat lookups instant.
- Response shape: `{ items: [{ label, lat, lon }] }` (a handful of candidates, not just the first match — some place names are ambiguous).
- No auth required (this is a public, read-only lookup, same tier as `relay/light` or `push/subscribe`), hence the rate limit rather than a permission check.

### BE-2 — Language files

New key for "no results"/upstream-unreachable (`Geocode::search()` returning an empty list is a normal response, not an error — no lang key needed for that case). Reuses `App.tooManyRequests` for the 429 case, same as every other rate-limited route.

---

## Frontend Tasks

### FE-1 — Load Celestial/D3 scripts only where `<StarMap>` is actually used

**Files:** `client/pages/_app.tsx:71-82` (remove the three global `<Script>` tags), `client/components/common/star-map/StarMap.tsx`

Move the three `next/script` tags (`d3.min.js` → `d3.geo.projection.min.js` → `celestial.min.js`, load order matters) into a small hook, e.g. `useCelestialScripts()` (new file `client/components/common/star-map/useCelestialScripts.ts`), using `strategy="afterInteractive"` with `onReady`/`onLoad` chaining so the three still load and execute strictly in order. `StarMap.tsx`'s existing `dynamic(..., { ssr: false })` wrapper (`StarMap.tsx:12-21`) renders the scripts + a loading skeleton until all three report ready, then mounts `StarMapRender`. This is transparent to every current call site (`/starmap`, `AstroObjectForm`, `ObjectHeader`, `PhotoHeader`) — they already only render `<StarMap>` when they need it, they just currently also happen to get the scripts for free from `_app.tsx`.

### FE-2 — Location & time state

**New files:** `client/components/common/star-map/useStarMapLocation.ts`, `client/components/common/star-map/StarMapLocationControl.tsx`

- `useStarMapLocation()`: on first mount (only when `showSettings` is true, i.e. only on `/starmap`), calls `navigator.geolocation.getCurrentPosition()` with a short timeout; on success stores `[lat, lon]`; on denial/timeout/unsupported, falls back to `defaultConfig.geopos` (Business Rule 3) — never blocks initial render, the map displays with the fallback position immediately and swaps in the real one if/when it resolves.
- Extend `StarMapSettings` (`types.ts:55-70`) with `geopos: [number, number]` and `date: string | null` (`null` = "now", otherwise an ISO string) — persisted via the existing `saveStarMapSettings`/`loadStarMapSettings` (`utils.ts:104-132`), which already backward-compatibly merges new fields into old saved payloads (Business Rule 2).
- `StarMapLocationControl`: a small panel entry (next to the existing `StarMapSettingsForm` groups, or a new group inside it) with a "Use my location" button, a manual lat/lon fallback, a text input wired to `GET /geocode` (debounced, via a new RTK Query endpoint `geocodeSearch` in `client/api/api.ts`) with a results dropdown, and a date/time input (native `<input type="datetime-local">` wrapped the way the kit's `Input` wraps native inputs elsewhere) plus a "Reset to now" button.
- Changing location/date calls d3-celestial's own live update API (`Celestial.skyview({ date, location })`) rather than tearing down and re-mounting the map — same "live patch, no rebuild" pattern `buildLiveSettingsPatch`/`Celestial.apply()` already uses for the settings-panel toggles (`StarMapRender.tsx:316-332`).

### FE-3 — Horizon / planetarium view mode

**Files:** `client/components/common/star-map/config.ts`, `constants.ts`, `types.ts`, `StarMapSettingsForm.tsx`, `utils.ts`

- Add `viewMode: 'sky' | 'horizon'` to `StarMapSettings` (default `'sky'`, i.e. today's flat equatorial chart — Business Rule 2).
- `buildVisualConfig`/`buildLiveSettingsPatch` (`utils.ts:139-192`) grow a branch for `viewMode === 'horizon'`: `transform: 'horizontal'`, `horizon: { show: true, ... }`, `daylight: { show: true, ... }`, `follow: 'zenith'` (or the resolved `[lat, lon]`-derived zenith position), and a projection suited to a local-sky view — **verify against d3-celestial's own readme/demo during implementation** which of its supported projections (`stereographic` and `orthographic` are the two candidates for this transform) reads best as "the dome of sky above you," since the bundled docs are the authority here, not this spec.
- `StarMapSettingsForm.tsx` gains a view-mode toggle (e.g. two `Button`/segmented-control options: "Карта неба" / "Небо сейчас"), positioned above the existing settings groups since it changes which of the other controls are even relevant (e.g. `equatorial`/`ecliptic`/`galactic` lines stay meaningful in both modes; `graticule` reads differently in horizon mode but doesn't need to be hidden).
- This mode is the one that actually depends on FE-2's location/date state — wire it so switching into `'horizon'` for the first time nudges the user toward granting geolocation if they haven't already (reuses FE-2's control, doesn't duplicate the prompt).
- **Ground silhouette + compass labels ("as in Stellarium Web").** Today's `horizon` config (`config.ts:117-124`) only gives a flat semi-transparent fill below the horizon line — extend it with a custom overlay drawn the same way the portal's own object layer already draws itself manually on every redraw (`Celestial.container`/`Celestial.context`, the `handleRedraw` pattern at `StarMapRender.tsx:165-188`, registered the same way via `Celestial.add({ redraw: ..., type: 'Point' })` at `StarMapRender.tsx:241-249`):
  - A simple procedurally-generated skyline (a handful of rounded "hill" bumps plus a sparse treeline silhouette — not real terrain, Business Rule 9) drawn right at the horizon circle's edge, filled in the same dark tone as `horizon.fill`.
  - Cardinal direction labels — N/E/S/W at minimum, optionally the four intermediate points — placed at azimuth 0°/90°/180°/270° etc. by feeding `[azimuth, 0]` through `Celestial.mapProjection()` (the same helper already used to place the custom popup arrow at `StarMapRender.tsx:100`), drawn just outside the horizon circle so they read clearly against both the sky and the ground silhouette.
  - Both redraw every frame Celestial redraws (pan/zoom/rotate), same as the existing custom-objects layer, so they stay glued to the horizon circle rather than drifting.
- This combination — horizon mode + ground silhouette + compass labels + a chosen date/time/location (FE-2) — is exactly the "compass + horizon, screenshot-ready" view described in the two workflows this spec targets.

### FE-4 — Search

**New file:** `client/components/common/star-map/StarMapSearch.tsx`

A search input (kit `Input` with a dropdown result list) matching against:
- `starnames.json`/`dsonames.json` (already fetched by d3-celestial itself into memory once the map is displayed — read via d3-celestial's own exposed data rather than re-fetching), plus constellation names from `constellations.json`.
- The portal's own objects (already available via `objectsGetListQuery`, same data already passed into `<StarMap objects={...}>` on `/starmap`).

Simple case-insensitive substring match is enough (no fuzzy-matching dependency needed for a catalog this size). On selecting a result, reuse the existing click-to-center flow already implemented for custom-object clicks (`Celestial.rotate({ center: [ra, dec, 0] })`, `StarMapRender.tsx:413`) and, if the target is one of the portal's own objects, open the existing photo popup the same way a canvas click does.

### FE-5 — Full DSO catalog opt-in

**File:** `client/components/common/star-map/config.ts`, `StarMapSettingsForm.tsx`

Add a second checkbox under the existing "Deep Sky Objects" toggle (`StarMapSettingsForm.tsx:57-61`), e.g. "Больше объектов" — only enabled once DSOs are shown at all. Toggling it swaps `dsos.data` between `'dsos.bright.json'` (default) and `'dsos.6.json'` (full catalog, already present in `client/public/data/`, currently dead weight) and re-applies via the same `Celestial.apply()` path (Business Rule 5) — the swap only triggers a fetch the first time it's turned on in a session.

### FE-6 — Shareable permalink

**File:** `client/pages/starmap.tsx`, `client/components/common/star-map/utils.ts`

Encode `viewMode`, `geopos`, `date`, `center`, and `zoom` into the page's URL query string (debounced on change, via Next's router, `replace` not `push` so panning doesn't spam browser history) and read them back on initial mount to override `loadStarMapSettings()`'s localStorage defaults when present — a shared link should reproduce the sender's exact view regardless of the recipient's own saved settings. Add a small "Скопировать ссылку" button next to the existing settings toggle button (`StarMapRender.tsx:456-463`).

### FE-7 — SEO fixes

**File:** `client/pages/starmap.tsx`

- Fix or remove the broken `openGraph.images` entry (`starmap.tsx:29-37`) — needs an actual `/public/screenshots/starmap.jpg` (a real screenshot of the upgraded map, produced once the rest of this spec ships — flag as a content/asset task, not just code).
- Rewrite `title`/`description` (`starmap.tsx:15,25-28`) to describe the atlas tool itself (free interactive online star map/planetarium — созвездия, планеты, поиск объектов, вид неба над вами прямо сейчас) rather than the astrophoto archive, matching the actual search intent behind "карта звездного неба онлайн" / "звездное небо онлайн бесплатно".
- Add a `SoftwareApplication` (or `WebPage` with `about`) JSON-LD block next to the existing `<BreadcrumbJsonLd currentPage={title} />` (`starmap.tsx:39`), same pattern already used for that component.
- Add a short crawlable intro paragraph / `<h1>` on the page itself (today's `/starmap` is close to pure canvas with no on-page text for either crawlers or first-time visitors landing from search) — brief, doesn't have to compete with the map for screen space, but gives search engines and screen readers something to index beyond the `<title>`.

### FE-11 — Object info panel (click-to-inspect)

**Files:** `client/components/common/star-map/StarMapRender.tsx`, new `client/components/common/star-map/objectInfo.ts`

Generalizes today's click handling (`findHitPoint`, `StarMapRender.tsx:388-423`), which currently only hit-tests the portal's own custom `.sky-points` layer, so that clicking **any** rendered star, planet, the Sun, the Moon, or a DSO also opens an info panel — not just the portal's own catalog objects. This needs an implementation-time check of what d3-celestial itself exposes for its built-in layers (its own demo has a click-for-info behavior for stars/planets — reuse that hook if it's public API, rather than re-implementing hit-testing against Celestial's internal rendered layers).

Panel content is computed independently of d3-celestial (Business Rule 10), from the clicked object's RA/Dec plus FE-2's resolved location + date, entirely via the project's **existing** `astronomy-engine`/`suncalc` utilities:

- **Every object:** name, type, magnitude, RA/Dec (`formatRA`/`formatDEC`, `client/utils/coordinates.ts:7,29`), and computed altitude/azimuth at the selected moment via `astronomy-engine`'s `Astronomy.Horizon()` (general RA/Dec → alt/az conversion — no per-body ephemeris needed for fixed-position stars/DSOs).
- **Sun:** rise/set + civil/nautical/astronomical dawn & dusk — reuse `makeSunEvents()` (`client/components/pages/observatory/astronomy-calc/utils.ts:11-24`) as-is, just parameterized by FE-2's location/date instead of the `Observer`/`AstroTime` it's currently always called with for "now, at the observatory."
- **Moon:** phase (`getMoonPhase`, `client/utils/moon.ts:8-11`) + illumination % (`getMoonIllumination`, `moon.ts:18-21`) + rise/set (`SunCalc.getMoonTimes`) + distance (`SunCalc.getMoonPosition(...).distance`) — same functions `visibility-chart/utils.ts` and `astronomy-calc/utils.ts` already call, just fed FE-2's date/location instead of "now"/the hardcoded observatory `LAT`/`LON`. This is precisely the "how low, what phase, at time Y for city X" data behind workflow #1 in the Overview.
- **Planets:** magnitude/phase/distance via `Astronomy.Illumination(body, time)`.

Reuses the existing popup positioning/clamping (`clampPopupPosition`, `utils.ts:30-50`) and popup DOM (`StarMapRender.tsx:484-517`) — for a portal object the panel still shows today's photo + link; for everything else (star/planet/Sun/Moon/DSO/meteor radiant) it shows this new astronomy-data content instead. One popup component, content branches on what was clicked.

### FE-12 — Meteor shower radiants

**New files:** `client/public/data/meteor-showers.json`, `client/components/common/star-map/meteorShowers.ts`

A small bundled catalog (~20–30 entries) of major annual showers per the IMO working list of visual meteor showers — `{ name, radiant: [ra, dec], activeFrom, activeTo, peak }` (month-day windows, reusable across years). Rendered exactly like the portal's own custom-objects layer (`Celestial.add({ type: 'Point', ... })`, the `handleCallback`/`handleRedraw` pair at `StarMapRender.tsx:154-188`) with a distinct "radiant" glyph + name label, toggled by a new "Радианты метеорных потоков" checkbox in `StarMapSettingsForm.tsx`.

Showers outside their active window **for the currently selected date** (FE-2 — defaults to "now") are dimmed or hidden rather than shown year-round; whichever active shower is closest to its `peak` is visually called out (e.g. a brighter/larger marker) — the "what should I frame right now" read behind workflow #2 in the Overview. Clicking a radiant marker opens the FE-11 info panel (name, radiant RA/Dec, current altitude/azimuth, peak date, active-now status) — same panel infrastructure as everything else, no special-casing.

### FE-13 — i18n

New keys under `components.common.star-map.*` (location control, view-mode toggle, search, DSO "more objects" toggle, permalink button, object info panel, meteor shower layer) and `pages.star-map.*` (rewritten title/description, on-page intro copy) — both `en` and `ru` locale files, per Business Rule 7.

### FE-14 — Tests

The module has zero test coverage today. At minimum, add `*.test.ts` for the pure logic this spec adds or touches (matching the project's existing per-util convention, e.g. `client/utils/*.test.ts`):
- Geolocation fallback resolution (grant / deny / timeout / unsupported → correct resulting `geopos`).
- Permalink encode/decode round-trip (FE-6).
- Search matching (FE-4) against a small fixture catalog.
- `buildVisualConfig`/`buildLiveSettingsPatch`'s new `viewMode` branch (FE-3) producing the expected horizon-mode config shape.
- `objectInfo.ts`'s per-object-type panel data (FE-11) for at least a star (alt/az only), the Moon (phase/illumination/rise-set/distance), and a planet (magnitude/phase/distance), against known reference values.
- Meteor shower active/peak-window resolution (FE-12) for a fixed test date against the fixture catalog.

### FE-15 — Run after changes

```bash
yarn eslint:fix && yarn prettier:fix && yarn test && yarn build
```

---

## Acceptance Criteria

- [ ] `/starmap` still renders today's flat equatorial chart by default, with all existing settings/localStorage behavior unchanged for a returning visitor
- [ ] A new "Небо сейчас" (horizon) mode shows the sky as seen from the resolved location right now, with a visible horizon line and daylight shading below it
- [ ] Horizon mode also shows a stylized ground/treeline silhouette and N/E/S/W compass labels at the horizon edge, glued to the horizon circle through pan/zoom/rotate — usable as-is for a screenshot
- [ ] Clicking the Moon shows phase %, illumination %, current altitude/azimuth, distance, and rise/set for the selected location + date/time — not just "now, at the observatory"
- [ ] Clicking any star, planet, Sun, or DSO (not just the portal's own catalog objects) opens an info panel with name, magnitude, RA/Dec, and computed altitude/azimuth for the selected location + date/time
- [ ] Meteor shower radiants can be toggled on; a shower outside its active date window for the selected date is dimmed/hidden, and the shower nearest its peak is visually highlighted; clicking a radiant opens the same info panel
- [ ] Denying the geolocation prompt (or an unsupported browser) falls back silently to the previous hardcoded coordinates — no error state, no blocked render
- [ ] A user can search a city by name and the map re-centers/re-computes for that location, via the rate-limited `GET /geocode` proxy (never a direct browser call to a third-party geocoder)
- [ ] Repeated identical `GET /geocode?q=...` calls within the cache TTL do not re-hit the upstream provider (verified via cache hit, not just response correctness)
- [ ] A user can search by star/constellation/planet/DSO/portal-object name and jump straight to it
- [ ] Turning on "Больше объектов" loads the full DSO catalog only once, on demand — not on initial page load
- [ ] A generated permalink, opened by someone else, reproduces the same view (mode, location, date, center, zoom) regardless of their own saved settings
- [ ] Celestial/D3 scripts no longer load on pages that don't render `<StarMap>` (verified via network tab on e.g. `/` or `/admin`)
- [ ] `og:image` on `/starmap` resolves to a real image; title/description describe the atlas tool itself, not the astrophoto archive
- [ ] New unit tests exist and pass for the geolocation-fallback, permalink, search, object-info-panel, and meteor-shower-window logic added by this spec
- [ ] All new UI strings exist in both `en` and `ru` locale files with proper (non-copied) translations
