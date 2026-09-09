# FEAT-27 — Star Atlas Upgrade (`/starmap` Planetarium Mode)

**Status:** In progress — frontend implemented (FE-1…FE-12 plus the UX additions listed under "Implementation notes" below); BE-1/BE-2 geocode proxy deferred, a bundled static city list stands in for it
**Priority:** Medium
**Affects:** Frontend (Next.js) + Backend (CodeIgniter 4, one small proxy endpoint)
**Parallel implementation:** Mostly frontend-only; the one backend piece (location search proxy) is a small, independent endpoint that can land before, after, or in parallel with the frontend work — the frontend can ship the geolocation/date UI without it and add the "search a city" affordance once it exists.

---

## Overview

`/starmap` receives real organic traffic for queries like "звездное небо онлайн", "карта звездного неба онлайн" and "карта звездного неба онлайн бесплатно", but the tool behind that traffic is a fairly plain equatorial star chart, not the "look up at your own sky right now" experience those queries actually want (compare [stellarium-web.org](https://stellarium-web.org/)). This spec closes that gap **without replacing the rendering engine**.

**Why not swap to Stellarium Web Engine (the actual engine behind stellarium-web.org):** it's a WebGL/WASM planetarium engine, but it's dual-licensed **AGPL-3.0 / commercial** — embedding it in this MIT-licensed project (`LICENSE`) would either force this repo (or at least the served frontend) to comply with AGPL's network-use source-disclosure clause, or require paying for a commercial license from Stellarium Labs. Neither is worth it for what's actually missing. Aladin Lite v3 (CDS Strasbourg) was also considered — permissively licensed and lightweight, but it's a real-sky-imagery/catalog viewer (HiPS surveys), not a stylized planetarium chart, so it doesn't solve the actual gap either.

**What's actually missing** is already native, shipped functionality in the current dependency, [d3-celestial](https://github.com/ofrohn/d3-celestial) v0.7.35 (`client/public/scripts/celestial.min.js`) — it's just never turned on:

- `client/components/common/star-map/config.ts:212` hardcodes `projection: 'mercator'` — d3-celestial also supports a local-sky planetarium view (`follow: 'zenith'` + `geopos` + an azimuthal projection) with `horizon.show`/`daylight.show` (`config.ts:44-47,117-124`), currently forced to `false`. Note: `transform` stays `'equatorial'` even in that mode — the only transforms d3-celestial has are equatorial/ecliptic/galactic/supergalactic; there is **no** `'horizontal'` transform (verified against the bundled `celestial.min.js`, where the word appears only as the exported eq→hor coordinate helper `Celestial.horizontal()`).
- `config.ts:116,283` hardcodes `geopos: [51.82, 55.17]` (the observatory's coordinates) — there is no real geolocation, no location search, and (per `StarMapRender.tsx`) no code path ever calls d3-celestial's date/location API at all, so the map is permanently frozen on "now, from the observatory."
- There is no search box, no full DSO catalog option (only the curated `dsos.bright.json`, `config.ts:50`), and no shareable "this is the view I found" link.
- `client/public/scripts/{d3,d3.geo.projection,celestial}.min.js` (~835 KB uncompressed) load `beforeInteractive` for **every page on the site** (`client/pages/_app.tsx:71-82`), not just the pages that render `<StarMap>`.
- `client/pages/starmap.tsx:29-37` points `openGraph.images` at `/screenshots/starmap.jpg`, which does not exist anywhere in the repo — social shares and search rich-previews get a broken image.
- `starmap.tsx:25-28`'s description talks about the astrophoto archive ("галактики, туманности, кометы... снятых любительским телескопом"), not about the atlas tool itself — it's answering the wrong search intent for the keywords actually driving traffic here.
- No unit/component tests exist for the `star-map` module at all (confirmed: no `*.test.*` files under `client/components/common/star-map/`), unlike the rest of the codebase's per-util test convention.

This is complementary to, not a duplicate of, **FEAT-9 ("What's Visible Tonight" Planner)**: FEAT-9 is a separate planning UI (a list of tonight's visible objects); this spec gives the map itself the date/time + location engine that a "tonight" feature would eventually want to reuse. FEAT-9 stays independently scoped and out of this spec.

**Two concrete workflows this spec is designed around** (both driven by the same "pick a place + a moment in time, then screenshot it" pattern):

1. **"Where will the Moon be, how low, what phase, for city X at time Y?"** — used today to post to a Telegram channel. Needs: location + date/time controls (FE-2), a horizon-style view so "how low" reads visually (FE-3), and a click-for-info panel giving phase/illumination/altitude/azimuth in numbers, not just a picture (FE-8).
2. **"Where's the radiant of a meteor shower, with compass directions, so I can frame a screenshot and post about it?"** — needs the horizon view with cardinal-direction labels (FE-3) and a radiant layer for known showers (FE-9).

Neither needs Stellarium Web Engine's actual per-location photographic landscapes — d3-celestial's own horizon/daylight rendering plus a stylized ground silhouette gets the same "compass + horizon, screenshot-ready" result, and the position/phase/rise-set math is already solved elsewhere in this codebase by `astronomy-engine`/`suncalc` (`client/utils/moon.ts`, `client/components/pages/observatory/astronomy-calc/utils.ts`, `client/components/common/visibility-chart/utils.ts`) — this spec reuses that, it doesn't reinvent it.

---

## Business Rules

1. **Stay on d3-celestial — no engine swap.** Every new capability below is either already built into d3-celestial (horizon/planetarium mode, alternate projections) or a thin layer around it (search, permalink). This keeps the project MIT-clean and avoids a WASM build pipeline (emscripten/SCons) the project has no other reason to take on.
2. **The existing equatorial map view is the default and keeps working exactly as it does today**, including existing saved `localStorage` settings (`STARMAP_STORAGE_KEY`, `client/components/common/star-map/constants.ts:15`) — the new horizon/planetarium view is an additional mode the user opts into, not a replacement. `loadStarMapSettings()`'s existing `{ ...DEFAULT_STARMAP_SETTINGS, ...parsed }` merge (`utils.ts:104-119`) already makes new `StarMapSettings` fields backward-compatible with old saved payloads for free.
3. **Geolocation is requested only on an explicit user gesture, and degrades gracefully.** The permission prompt is triggered by pressing "Use my location" in FE-2's control, or by the nudge shown on first switching into horizon mode (FE-3) — never automatically on page load: browsers suppress/de-prioritize no-gesture prompts (Chrome's "quieter UI"), and a first-time visitor from search would most likely deny permanently. On denial/timeout/unsupported browser, fall back silently to today's hardcoded `defaultConfig.geopos` (`config.ts:116`) exactly as now. A user is never blocked or nagged — the map always renders immediately with the saved/fallback position.
4. **Location search never calls a third-party geocoder directly from the browser.** Every other external integration in this codebase (Google/Yandex/VK OAuth, Alfa-Bank payments) is proxied through a backend `Library` class using `Config\Services::curlrequest()` (see `GoogleClient.php`, `AlfaBankClient.php`) — location search follows the same shape, both to respect the geocoder's usage policy (identifiable server-side requests) and for consistency. Search is **submit-driven** (Enter / a search button), never search-as-you-type: Nominatim's usage policy explicitly forbids autocomplete-style querying, and debouncing keystrokes does not change that.
5. **The full DSO catalog is opt-in, never the default.** The default stays the small curated `dsos.bright.json` — a visitor arriving from a Google search on mobile/4G should not pay for a bigger catalog than the default view needs. The full `dsos.6.json` (already present in `client/public/data/`, currently unused) is fetched lazily only when a user explicitly turns on a "more objects" toggle.
6. **Celestial/D3 scripts load only on pages that actually render `<StarMap>`.** Today they load `beforeInteractive` for the entire site (`_app.tsx:71-82`); every page that never mounts the map (home, admin, mailings, stargazing, etc.) is paying ~835 KB it doesn't use.
7. **Every new interactive control follows the existing i18n convention** — Russian fallback text in `t('key', 'Текст')`, new keys added to both `client/public/locales/en/translation.json` and `client/public/locales/ru/translation.json`.
8. **SEO copy is rewritten to match the actual search intent** driving traffic to this page (the atlas tool itself), not the astrophoto archive — this is a content change to `starmap.tsx`'s title/description/on-page copy, not just a technical fix.
9. **The horizon-mode ground is a stylized generic silhouette (hills/treeline), not a geo-accurate landscape.** Real per-location photographic panoramas are Stellarium's actual "landscapes" feature and require real engine/asset support this project isn't taking on (Business Rule 1) — a generic dark silhouette at the horizon edge gives the same "compass + horizon, screenshot-ready" read without that.
10. **Object info (altitude/azimuth, Moon phase, rise/set) is computed independently of d3-celestial**, via the project's existing `astronomy-engine`/`suncalc` utilities, from the clicked object's RA/Dec plus FE-2's resolved location+date. This decouples the info panel from whatever internal projection math d3-celestial happens to use for rendering, and reuses code that already exists and is already tested elsewhere in the codebase rather than duplicating astronomy math a second way.
11. **Meteor shower radiants are a small static, rarely-changing catalog** (radiant coordinates + active date windows barely change year to year, per the IMO working list of visual meteor showers) — bundled as a JSON asset alongside the existing star/DSO catalogs (`client/public/data/`), no database table, no admin CRUD, no backend endpoint.
12. **The selected date/time is interpreted in the selected location's timezone, not the browser's.** Workflow #1 is "the Moon over city X at 21:00 *local to city X*" — a `datetime-local` value read in the browser's zone would be hours off for a city in another timezone. `client/public/data/timezones.json` already ships with d3-celestial's data files (its own built-in location form uses it for exactly this geopos→timezone resolution) — resolve the timezone from the chosen `geopos` and convert the entered wall-clock time through it before handing the date to Celestial / `astronomy-engine`. Label the input so it's clear the time is local to the chosen place.
13. **The selected date/time is never persisted to `localStorage`.** A persisted date means a visitor returning a week later silently sees a stale, frozen sky with no hint why. `date` lives in component state and in the permalink URL (FE-6) only; every fresh page load starts at "now" unless the URL says otherwise. (`geopos` *is* persisted — a place doesn't go stale.)

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

Remove the three global `<Script>` tags (`d3.min.js` → `d3.geo.projection.min.js` → `celestial.min.js`, load order matters) and replace them with a small hook, `useCelestialScripts()` (new file `client/components/common/star-map/useCelestialScripts.ts`), that injects the three `<script>` elements sequentially via a shared module-level promise chain (each next script only inserted after the previous one's `load` event — strict order without relying on `next/script`'s afterInteractive ordering, which isn't guaranteed across multiple tags). `StarMap.tsx` renders the same loading skeleton it already shows for the `dynamic(..., { ssr: false })` bundle until the hook reports ready, then mounts `StarMapRender`. This is transparent to every current call site (`/starmap`, `AstroObjectForm`, `ObjectHeader`, `PhotoHeader`) — they already only render `<StarMap>` when they need it, they just currently also happen to get the scripts for free from `_app.tsx`.

### FE-2 — Location & time state

**New files:** `client/components/common/star-map/useStarMapLocation.ts`, `client/components/common/star-map/StarMapLocationControl.tsx`

- `useStarMapLocation()`: owns the resolved `[lat, lon]` and `date` state (only used when `showSettings` is true, i.e. only on `/starmap`). `navigator.geolocation.getCurrentPosition()` (short timeout) is called only from an explicit gesture — the "Use my location" button, or the nudge on first switching into horizon mode (Business Rule 3); on success stores `[lat, lon]`, on denial/timeout/unsupported falls back to `defaultConfig.geopos` — never blocks render, the map displays with the saved/fallback position immediately.
- Extend `StarMapSettings` (`types.ts:55-70`) with `geopos: [number, number]` — persisted via the existing `saveStarMapSettings`/`loadStarMapSettings` (`utils.ts:104-132`), which already backward-compatibly merges new fields into old saved payloads (Business Rule 2). The selected `date` (`null` = "now", otherwise an ISO string) is component state + permalink (FE-6) only — deliberately **not** persisted (Business Rule 13).
- `StarMapLocationControl`: a small panel entry (next to the existing `StarMapSettingsForm` groups, or a new group inside it) with a "Use my location" button, a manual lat/lon fallback, a text input wired to `GET /geocode` (submit-driven — Enter / search button, Business Rule 4 — via a new lazy RTK Query endpoint `geocodeSearch` in `client/api/api.ts`) with a results dropdown, and a date/time input (native `<input type="datetime-local">` wrapped the way the kit's `Input` wraps native inputs elsewhere) plus a "Reset to now" button. The entered wall-clock time is interpreted in the selected location's timezone (Business Rule 12).
- Changing location/date calls d3-celestial's own live update API (`Celestial.skyview(...)` — exported by the bundled build alongside `Celestial.date()`/`Celestial.location()`; verify the exact signature against the readme during implementation) rather than tearing down and re-mounting the map — same "live patch, no rebuild" pattern `buildLiveSettingsPatch`/`Celestial.apply()` already uses for the settings-panel toggles (`StarMapRender.tsx:316-332`).

### FE-3 — Horizon / planetarium view mode

**Files:** `client/components/common/star-map/config.ts`, `constants.ts`, `types.ts`, `StarMapSettingsForm.tsx`, `utils.ts`

- Add `viewMode: 'sky' | 'horizon'` to `StarMapSettings` (default `'sky'`, i.e. today's flat equatorial chart — Business Rule 2).
- `buildVisualConfig`/`buildLiveSettingsPatch` (`utils.ts:139-192`) grow a branch for `viewMode === 'horizon'`: keep `transform: 'equatorial'` (there is no horizontal transform — see Overview) and instead set `geopos` (from FE-2), `follow: 'zenith'`, `horizon: { show: true, ... }`, `daylight: { show: true, ... }`, and an azimuthal projection suited to a local-sky view — **verify against d3-celestial's own readme/demo during implementation** which of its supported projections (`stereographic`, `airy`, `orthographic` are the candidates) reads best as "the dome of sky above you," since the bundled docs are the authority here, not this spec. The bundle also exports `Celestial.zenith()` for keeping the view glued to the zenith as date/location change.
- `StarMapSettingsForm.tsx` gains a view-mode toggle (e.g. two `Button`/segmented-control options: "Карта неба" / "Небо сейчас"), positioned above the existing settings groups since it changes which of the other controls are even relevant (e.g. `equatorial`/`ecliptic`/`galactic` lines stay meaningful in both modes; `graticule` reads differently in horizon mode but doesn't need to be hidden).
- This mode is the one that actually depends on FE-2's location/date state — wire it so switching into `'horizon'` for the first time nudges the user toward granting geolocation if they haven't already (reuses FE-2's control, doesn't duplicate the prompt).
- **Ground silhouette + compass labels ("as in Stellarium Web").** Today's `horizon` config (`config.ts:117-124`) only gives a flat semi-transparent fill below the horizon line — extend it with a custom overlay drawn the same way the portal's own object layer already draws itself manually on every redraw (`Celestial.container`/`Celestial.context`, the `handleRedraw` pattern at `StarMapRender.tsx:165-188`, registered the same way via `Celestial.add({ redraw: ..., type: 'Point' })` at `StarMapRender.tsx:241-249`):
  - A simple procedurally-generated skyline (a handful of rounded "hill" bumps plus a sparse treeline silhouette — not real terrain, Business Rule 9) drawn right at the horizon circle's edge, filled in the same dark tone as `horizon.fill`.
  - The area **below** the horizon is the ground, not empty canvas: the airy projection clips at exactly 90° from the zenith, so nothing under the horizon can be projected and `horizon.fill` alone leaves the region outside the dome showing the page background. The ground is therefore filled in screen space — the skyline's top edge pushed radially away from the projected zenith past the canvas edges (`drawGroundSector` in `horizonOverlay.ts`), tinted with a radial gradient (lighter just under the crest, near-black toward the canvas edge) so the sky reads as a dome standing on solid ground.
  - Cardinal direction labels — N/E/S/W at minimum, optionally the four intermediate points — at azimuth 0°/90°/180°/270° etc., altitude 0°. `Celestial.mapProjection()` (the same helper already used to place the custom popup arrow at `StarMapRender.tsx:100`) expects **equatorial** coordinates — the map has no horizontal transform — so each label's az/alt must first be converted to RA/Dec for the current date + location via `astronomy-engine`'s horizontal→equatorial rotation helpers (d3-celestial itself exports only the opposite direction, `Celestial.horizontal()`), and only then projected; recomputed on every redraw. Drawn just outside the horizon circle so they read clearly against both the sky and the ground silhouette.
  - Both redraw every frame Celestial redraws (pan/zoom/rotate), same as the existing custom-objects layer, so they stay glued to the horizon circle rather than drifting.
- **Stellarium-style local navigation.** d3-celestial's built-in interaction (`d3.geo.zoom`) is a free equatorial trackball: a drag rotates the sphere around whatever axis the gesture implies, and its wheel/pinch zoom rotates as well to keep the point under the cursor fixed. Neither knows about the horizon, so both roll the sky — the ground ends up tilted or overhead, which visitors read as a broken map. Horizon mode therefore detaches those listeners after every `display()` and drives navigation itself (`horizonView.ts`, `horizonNavigation.ts`, `useHorizonNavigation.ts`):
  - The state is a **view direction** (azimuth + altitude), not an equatorial center. `viewToCenter()` converts it for `Celestial.rotate()`: the center is that direction's RA/Dec, and the roll is the **parallactic angle** there — the angle between "towards the celestial pole" (where a roll of 0 puts screen-up) and "towards the zenith". Rolling by it puts the zenith straight up, which is what keeps the horizon horizontal and the ground at the bottom at every azimuth and altitude.
  - A drag looks around, with the sky following the pointer: horizontally it changes the azimuth, vertically the altitude (clamped to 1°…89.9° — at the zenith the roll is undefined, and below the horizon the zenith itself leaves the projection's clip circle, which the ground fill is measured against). Wheel and pinch zoom about the center. Leaving the whole-sky dome bumps the zoom so the sky covers the frame instead of sitting in it as a bubble (`ensureLookAroundZoom`), and "fit view" goes back to the dome: straight up, facing south, whole sky, north at the top.
  - The direction is shared through the permalink (`az`/`alt`) and survives a date change: a fixed azimuth/altitude drifts across the sky, so the map is re-pointed after every `skyview()`. That is also why `follow` is `'center'` and not `'zenith'` — a zenith follow would re-center the map and throw away wherever the visitor was looking.
  - Everything else that used to move the center is a no-op on it in horizon mode for the same reason: the search's constellation hit and the click-to-open info popup.
  - Two implementation traps worth remembering: the mode runs with `disableAnimations`, because Celestial's 1.5–2 s rotate/zoom transitions cannot keep up with a per-frame drag; and `astronomy-engine`'s `VectorFromHorizon` with refraction **never returns** for an altitude of exactly 90° (its inverse-refraction loop oscillates), so "the zenith" is always sampled at `ZENITH_ALTITUDE` = 89.99°.
- This combination — horizon mode + ground silhouette + compass labels + a chosen date/time/location (FE-2) — is exactly the "compass + horizon, screenshot-ready" view described in the two workflows this spec targets.

### FE-4 — Search

**New file:** `client/components/common/star-map/StarMapSearch.tsx`

A search input (kit `Input` with a dropdown result list) matching against:
- `starnames.json` (1.1 MB) / `dsonames.json` (312 KB), plus constellation names from `constellations.json` — fetched lazily by the search itself the first time the search box is opened. d3-celestial does fetch these files at display time, but keeps them in a private closure (nothing like `Celestial.starnames` is exported — verified against the bundled build), so they cannot be read back from the library; a second fetch is near-free anyway, the browser's HTTP cache already has them. Note the star features in `stars.6.json` carry only a HIP id + magnitude — star names exist *only* in `starnames.json`.
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

### FE-8 — Object info panel (click-to-inspect)

**Files:** `client/components/common/star-map/StarMapRender.tsx`, new `client/components/common/star-map/objectInfo.ts`

Generalizes today's click handling (`findHitPoint`, `StarMapRender.tsx:388-423`), which currently only hit-tests the portal's own custom `.sky-points` layer, so that clicking **any** rendered star, planet, the Sun, the Moon, or a DSO also opens an info panel — not just the portal's own catalog objects. d3-celestial has no public click-for-info API (its demo wires this up against internals), but every built-in layer binds its loaded GeoJSON to `Celestial.container` selections (`.stars`, `.dsos`, `.planets`, …), so hit-testing works with exactly the pattern `findHitPoint` (`utils.ts`) already uses for the custom `.sky-points` layer — iterate the bound data, project with `Celestial.mapProjection()`, distance-check. Star features carry only a HIP id + magnitude; a clicked star's display name comes from the lazily-fetched `starnames.json` (shared with FE-4).

Panel content is computed independently of d3-celestial (Business Rule 10), from the clicked object's RA/Dec plus FE-2's resolved location + date, entirely via the project's **existing** `astronomy-engine`/`suncalc` utilities:

- **Every object:** name, type, magnitude, RA/Dec (`formatRA`/`formatDEC`, `client/utils/coordinates.ts:7,29`), and computed altitude/azimuth at the selected moment via `astronomy-engine`'s `Astronomy.Horizon()` (general RA/Dec → alt/az conversion — no per-body ephemeris needed for fixed-position stars/DSOs).
- **Sun:** rise/set + civil/nautical/astronomical dawn & dusk — reuse `makeSunEvents()` (`client/components/pages/observatory/astronomy-calc/utils.ts:11-24`) as-is, just parameterized by FE-2's location/date instead of the `Observer`/`AstroTime` it's currently always called with for "now, at the observatory."
- **Moon:** phase (`getMoonPhase`, `client/utils/moon.ts:8-11`) + illumination % (`getMoonIllumination`, `moon.ts:18-21`) + rise/set (`SunCalc.getMoonTimes`) + distance (`SunCalc.getMoonPosition(...).distance`) — same functions `visibility-chart/utils.ts` and `astronomy-calc/utils.ts` already call, just fed FE-2's date/location instead of "now"/the hardcoded observatory `LAT`/`LON`. This is precisely the "how low, what phase, at time Y for city X" data behind workflow #1 in the Overview.
- **Planets:** magnitude/phase/distance via `Astronomy.Illumination(body, time)`.

Reuses the existing popup positioning/clamping (`clampPopupPosition`, `utils.ts:30-50`) and popup DOM (`StarMapRender.tsx:484-517`) — for a portal object the panel still shows today's photo + link; for everything else (star/planet/Sun/Moon/DSO/meteor radiant) it shows this new astronomy-data content instead. One popup component, content branches on what was clicked.

### FE-9 — Meteor shower radiants

**New files:** `client/public/data/meteor-showers.json`, `client/components/common/star-map/meteorShowers.ts`

A small bundled catalog (~20–30 entries) of major annual showers per the IMO working list of visual meteor showers — `{ name, radiant: [ra, dec], activeFrom, activeTo, peak }` (month-day windows, reusable across years). Rendered exactly like the portal's own custom-objects layer (`Celestial.add({ type: 'Point', ... })`, the `handleCallback`/`handleRedraw` pair at `StarMapRender.tsx:154-188`) with a distinct "radiant" glyph + name label, toggled by a new "Радианты метеорных потоков" checkbox in `StarMapSettingsForm.tsx`.

Showers outside their active window **for the currently selected date** (FE-2 — defaults to "now") are dimmed or hidden rather than shown year-round; whichever active shower is closest to its `peak` is visually called out (e.g. a brighter/larger marker) — the "what should I frame right now" read behind workflow #2 in the Overview. Clicking a radiant marker opens the FE-8 info panel (name, radiant RA/Dec, current altitude/azimuth, peak date, active-now status) — same panel infrastructure as everything else, no special-casing.

### FE-10 — i18n

New keys under `components.common.star-map.*` (location control, view-mode toggle, search, DSO "more objects" toggle, permalink button, object info panel, meteor shower layer) and `pages.star-map.*` (rewritten title/description, on-page intro copy) — both `en` and `ru` locale files, per Business Rule 7.

### FE-11 — Tests

The module has zero test coverage today. At minimum, add `*.test.ts` for the pure logic this spec adds or touches (matching the project's existing per-util convention, e.g. `client/utils/*.test.ts`):
- Geolocation fallback resolution (grant / deny / timeout / unsupported → correct resulting `geopos`).
- Permalink encode/decode round-trip (FE-6).
- Search matching (FE-4) against a small fixture catalog.
- `buildVisualConfig`/`buildLiveSettingsPatch`'s new `viewMode` branch (FE-3) producing the expected horizon-mode config shape.
- `objectInfo.ts`'s per-object-type panel data (FE-8) for at least a star (alt/az only), the Moon (phase/illumination/rise-set/distance), and a planet (magnitude/phase/distance), against known reference values.
- Meteor shower active/peak-window resolution (FE-9) for a fixed test date against the fixture catalog.
- Timezone resolution + wall-clock conversion (Business Rule 12) for a location in a timezone different from the test runner's.

### FE-12 — Run after changes

```bash
yarn eslint:fix && yarn prettier:fix && yarn test && yarn build
```

---

## Implementation notes (September 2026)

What actually shipped on top of the tasks above, and where the implementation deliberately deviates from the text of this spec:

- **Business Rule 3 is applied more strictly than written.** Switching into horizon mode no longer fires the browser geolocation prompt by itself. Instead a dismissible nudge ("Показать небо над вами?", `StarMapGeoNudge`, `geoNudge.ts`) appears only in horizon mode while the observer position is still the default observatory point and the user has not dismissed it (`LOCAL_STORAGE.STARMAP_GEO_NUDGE_DISMISSED`). The prompt fires only from its "Определить местоположение" button or from "Моё местоположение" in the panel. On denial the nudge says the observatory sky is shown.
- **BE-1 stand-in: static city list — shipped, then removed (September 2026).** `client/public/data/cities.json` (~160 entries: every Russian regional centre and city over 500k, CIS/Baltic capitals, major world cities) drove a combobox "Город" in `StarMapLocationControl` (`cities.ts`: `matchCities`, `findNearestCity`), and the status chip labelled the position with the nearest listed city within 25 km. The combobox, the module and the catalog were all dropped during the settings-panel redesign: the place is set by the latitude/longitude fields and "Моё местоположение", and the chip shows raw coordinates. **TODO:** bring city search back — either by restoring the static catalog (see git history for `cities.ts`) or, better, on top of the `GET /geocode` proxy of BE-1 when it lands. No third-party call is made from the browser either way (Business Rule 4).
- **d3-celestial's built-in timezone lookup is disabled** (`settimezone: false` in `buildVisualConfig`). The bundled library otherwise calls `api.timezonedb.com` over plain http with the observer coordinates on every `skyview({ location })` and then shifts the zenith by the difference between that zone and the browser's — this both leaked visitor coordinates to a third party and rendered a daytime dome for a night-time permalink when the viewer's browser sat in another zone. `buildSkyviewPatch()` now always passes the offset explicitly.
- **Business Rule 12 in the UI.** Timezone resolution (`timezone.ts`, local polygon lookup, no network) is lazy on a bare visit but eager whenever a date is set (permalink `dt`, presets, steps); the date field is the project's own `DateTimeInput` (`client/components/ui/date-time-input`, shared with the event form: calendar + hour/minute selects instead of a native `datetime-local`), labelled "Дата и время (местное для точки)" and showing the resolved zone/offset under it. Two placement details are forced by the kit's `Popout`/`Select` never flipping upward: the popout is portalled on desktop so the scrolling sidebar cannot clip it (`portal={isDesktop}` — on the mobile sheet a fixed portal would open below the fold, so there it stays in flow and the component's own stylesheet docks the panel to the bottom edge under 768 px), and `timePosition="above"` lifts the hour/minute selects to the top of the panel, since from the bottom their option lists opened past the screen edge. The zone is resolved as the popout opens (`onOpenChange`), so the value shown is already the place's local time.
- **Time controls beyond FE-2:** ±1 h / ±1 d steppers (`timeStep.ts`, day steps keep the place's wall-clock across DST) and a "Сегодня ночью" preset (`nightPreset.ts`: next end of astronomical twilight, degrading to nautical/civil, disabled under polar day).
- **"Now" ticks.** With no date selected the map re-applies the current instant once a minute (`useLiveClock`, paused while the tab is hidden), so an open tab does not silently freeze.
- **Status chip** (`StarMapStatusChip`) is always visible on `/starmap`, even in hide-UI/screenshot mode: place · moment. Tapping it returns to "now" when a date is set, or opens the settings otherwise. This is the caption for the Telegram-screenshot workflows in the Overview.
- **Atmosphere toggle.** `daylight.show` is a user setting (`atmosphere`, default on, horizon mode only, live-patched) and a permalink parameter (`atm=0`), so the daytime sky can be inspected with stars visible. It only ever drew nothing until the zenith sync below was added.
- **Celestial's daylight pass needs its own zenith, and `follow: 'center'` never updates it.** The bundled library keeps the zenith in a private variable written only by its internal `l()` routine, which `skyview()` calls exclusively when `follow === 'zenith'`. Horizon mode sets `follow: 'center'` (it drives the center itself), so the zenith stayed at `[0, 0]`, the daylight pass measured the Sun against a point on the celestial equator, read "more than 108° from the zenith" as night and painted nothing — at noon as much as at midnight, with the toggle on or off. `useCelestialDisplay.syncCelestialZenith` now calls `Celestial.date(when, offset)` — the one public entry that runs `l()`, and with `follow: 'center'` it recomputes the zenith and redraws without re-centering — after every `skyview()` (first display, date/location change, the once-a-minute "now" tick), always after the patch, since `l()` reads the observer position from the hidden form that `skyview()` has just written.
- **Layout.** On desktop the settings panel is a docked 280 px sidebar that shrinks the map rather than overlaying it; on mobile it stays a bottom sheet. A Stellarium-style quick bar at the bottom toggles constellation lines/names, graticule, DSOs, planets, Milky Way, meteor radiants, horizon mode and atmosphere. One left-hand rail of square icon buttons holds zoom in/out, the settings/search/link buttons, and — in sky mode only — "fit view" (resets the zoom; horizon mode opens at its own fitted zoom, cannot be zoomed out past it and reaches the whole-sky dome by looking up, so the button has nothing to fix there); d3-celestial's own zoom buttons are disabled on `/starmap` only (`controls: false`), object/photo pages keep them. The mobile FAB toggles horizon/sky mode.
- **Interaction polish.** Pointer cursor over every clickable object (stars ≤ 4m, DSOs ≤ 9m, planets, radiants — hover-tested synchronously against cached catalogs), grab/grabbing while panning; info popup positioned from its measured size; keyboard-navigable search and city lists (`useListNavigation`, `role=combobox/listbox/option`), component icons per object kind (`kindIcons.tsx`, `client/components/icons/LayerIcons.tsx`) with a text type label on each result; copy-link falls back to `execCommand` and then to a manual-copy panel.
- **Live-patch effects are StrictMode-safe**: "skip the first run" flags were replaced by previous-value comparison so dev double-invocation never re-applies `Celestial.apply`/`skyview`/`router.replace`. Known dev-only leftover: the main `Celestial.display` effect is not idempotent under StrictMode (its second run re-displays after `permalinkZoomRef` was already consumed), so a permalink's zoom can be lost in `yarn dev` but not in production.
- **Scripts load lazily** everywhere (`useCelestialScripts`), not just on `/starmap`; object/photo pages show the same skeleton until d3/celestial arrive.
- **Horizon mode has a zoom-out floor, so the sky never becomes a bubble.** d3-celestial clamps zooming out at the projection's base scale, so the base scale itself is set to the fitted dome: `computeHorizonCanvasLayout` sizes the projection at `HORIZON_FIT_FRACTION` (0.88) of the container's smaller side, which makes "the whole sky circle inside the frame, with its compass margin" the furthest a visitor can zoom out of the dome view. A look-around view is centered on a direction rather than the zenith, so there the floor is instead "the sky covers the frame" (`computeHorizonCoverZoom` — the disc's radius reaches the container corner); it is enforced in `useCelestialDisplay`'s `zoomBy`, which every wheel, pinch and toolbar zoom goes through, and is also what `ensureLookAroundZoom` zooms up to when the dome is left.
- **Horizon mode opens on a look-around, not on the dome.** `INITIAL_VIEW` (`horizonView.ts`: south, altitude 30°) is what the mode starts from, at `INITIAL_HORIZON_ZOOM` (1.5) times the cover floor, so the opening frame is filled with sky, with the ground, treeline and compass at the bottom — the whole-sky dome is one tap away on the rail's "fit view". Looking straight up used to be the start, and it reads as a bare circle floating in the frame. The two are paired — the opening zoom narrows the field of view, so a higher altitude pushes the ground off the bottom edge. Related fix: the ground was missing from the dome view entirely — the fill's runs required both the silhouette *and* the horizon line to project, and `MAX_SAMPLE_DISTANCE_DEG` (1° of margin) rejected everything on the far side of a zenith-centered view. The fill now traces the silhouette alone (the horizon row is only needed for the zenith-less fallback) and the margin is 89.95°.

Still open from this spec: BE-1/BE-2 (server geocode proxy), the real `og:image` screenshot asset (FE-7), and a rewrite of the on-page intro copy to mention the planetarium features.

## Acceptance Criteria

- [x] `/starmap` still renders today's flat equatorial chart by default, with all existing settings/localStorage behavior unchanged for a returning visitor
- [x] A new "Небо сейчас" (horizon) mode shows the sky as seen from the resolved location right now, with a visible horizon line and daylight shading below it
- [x] Horizon mode also shows a stylized ground/treeline silhouette and N/E/S/W compass labels at the horizon edge, glued to the horizon circle through pan/zoom/rotate — usable as-is for a screenshot
- [x] Clicking the Moon shows phase %, illumination %, current altitude/azimuth, distance, and rise/set for the selected location + date/time — not just "now, at the observatory"
- [x] Clicking any star, planet, Sun, or DSO (not just the portal's own catalog objects) opens an info panel with name, magnitude, RA/Dec, and computed altitude/azimuth for the selected location + date/time
- [x] Meteor shower radiants can be toggled on; a shower outside its active date window for the selected date is dimmed/hidden, and the shower nearest its peak is visually highlighted; clicking a radiant opens the same info panel
- [x] The geolocation prompt only ever appears after an explicit user gesture ("Use my location" button, or the "Определить местоположение" button of the horizon-mode nudge — switching modes by itself no longer prompts), never on page load; denying it (or an unsupported browser) falls back silently to the previous hardcoded coordinates — no error state, no blocked render
- [ ] A user can search a city by name and the map re-centers/re-computes for that location — shipped against a bundled `cities.json` list, then removed with the settings-panel redesign; the place is set by coordinates for now, and the `GET /geocode` proxy for arbitrary places is still deferred (BE-1)
- [x] A picked date/time is interpreted in the selected location's timezone: choosing 21:00 for a city in another timezone produces that city's 21:00 sky, not the browser's
- [x] Reloading `/starmap` without URL parameters always shows "now" — a previously picked date/time is not restored from localStorage
- [ ] (deferred with BE-1) Repeated identical `GET /geocode?q=...` calls within the cache TTL do not re-hit the upstream provider (verified via cache hit, not just response correctness)
- [x] A user can search by star/constellation/planet/DSO/portal-object name and jump straight to it
- [x] Turning on "Больше объектов" loads the full DSO catalog only once, on demand — not on initial page load
- [x] A generated permalink, opened by someone else, reproduces the same view (mode, location, date, center, zoom) regardless of their own saved settings
- [x] Celestial/D3 scripts no longer load on pages that don't render `<StarMap>` (verified via network tab on e.g. `/` or `/admin`)
- [~] `og:image` on `/starmap` resolves to a real image — **not yet** (the broken entry was removed, a real screenshot asset is still to be produced); title/description already describe the atlas tool itself
- [x] New unit tests exist and pass for the geolocation-fallback, permalink, search, object-info-panel, and meteor-shower-window logic added by this spec
- [x] All new UI strings exist in both `en` and `ru` locale files with proper (non-copied) translations
