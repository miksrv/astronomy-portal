# FEAT-28 — Star Map Follow-ups

**Status:** Planned
**Priority:** Low
**Affects:** Backend (CodeIgniter 4, one proxy endpoint) + Frontend (Next.js)

The `/starmap` planetarium mode (FEAT-27) shipped in 4.12.0. This spec collects what was deferred from it.

---

## 1. City search via a server geocode proxy

The place is currently set only by latitude/longitude fields and "Моё местоположение"; the status chip shows raw coordinates. A bundled `cities.json` picker shipped once and was removed in the settings-panel redesign (see git history for `client/components/common/star-map/cities.ts` if the static list is worth restoring as a fallback).

**Rule:** the browser never calls a third-party geocoder directly — all lookups go through our backend.

### Backend

- `server/app/Libraries/GeocodeClient.php` — mirrors `AlfaBankClient`'s `CURLRequest` setup (explicit `timeout`/`connect_timeout`, `$getShared = false`, `try/catch (\Throwable)` → `log_message` + `null`). Calls a provider such as OSM Nominatim `/search` with an identifying `User-Agent`/`Referer` per its usage policy and `accept-language` from `LocaleLibrary`.
- `server/app/Controllers/Geocode.php` — `GET /geocode?q=`, public, rate-limited (`ratelimit:geocode_search,20,60`), `OPTIONS` handler like every other group. Rejects 1-character queries. Cached via `Services::cache()` for ~1 day, keyed by `'geocode_' . md5(lower(trim(q)) . '_' . locale)`. Response: `{ items: [{ label, lat, lon }] }` (several candidates — names are ambiguous). Empty list is a normal response; 429 reuses `App.tooManyRequests`.

### Frontend

- Lazy RTK Query endpoint `geocodeSearch` in `client/api/api.ts`.
- Submit-driven search field (Enter / button, not per keystroke) with a results dropdown in `StarMapLocationControl`; selecting a result sets `geopos` the same way the coordinate fields do.
- Status chip shows the chosen place's label instead of raw coordinates when one is known.

## 2. `og:image` for `/starmap`

`client/pages/starmap.tsx` intentionally omits `openGraph.images` because `/screenshots/starmap.jpg` never existed. Produce a real screenshot of the horizon view, add it to `client/public/`, and restore the entry.

## 3. Intro copy

Rewrite the crawlable intro (`client/components/pages/starmap/`) to describe the planetarium features (horizon view, place/time, search, permalinks) — the keywords driving traffic are "звездное небо онлайн" / "карта звездного неба онлайн".

## 4. Smaller accuracy / UX items

- Sun/Moon rise-set in the object popup is computed for the browser's day, not the selected place's local day.
- Moon hit-testing uses a geocentric position; at high zoom the topocentric offset is visible.
- Popup actions from the mockup (center on object, share) are not implemented.

## Acceptance Criteria

- [ ] A city can be found by name and the map re-computes for it; repeated identical queries within the TTL are served from cache
- [ ] `og:image` on `/starmap` resolves to a real image
- [ ] Intro copy mentions the planetarium features
- [ ] New UI strings exist in both `en` and `ru` locale files
