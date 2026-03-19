# Frontend Roadmap

Generated from a full codebase audit. Tasks are grouped by category and ordered by priority within each group.

---

## Performance

### PERF-01 — Three large scripts loaded `beforeInteractive` on every page

**File:** `pages/_app.tsx` (lines 43–54)
`d3.min.js`, `d3.geo.projection.min.js`, and `celestial.min.js` (~200 KB combined) are loaded with `strategy='beforeInteractive'`, blocking the main thread before hydration on every page — including About, Auth, and 404 — which do not use the star map. Change the strategy to `lazyOnload` or move these scripts inside the `StarMap` dynamic import so they are only fetched when the component is rendered.

### PERF-02 — Astronomical visibility chart blocks the main thread with 288 synchronous calculations

**File:** `components/common/visibility-chart/VisibilityChart.tsx` (lines 50–125)
A full 24-hour window of altitude calculations (288 points at 5-minute intervals) is computed synchronously in a `useEffect`. Move the computation to a Web Worker or schedule it with `requestIdleCallback` to avoid jank on low-end devices.

### PERF-03 — `AstronomyCalc` re-runs `SunCalc` on every 1-second tick

**File:** `components/pages/observatory/astronomy-calc/AstronomyCalc.tsx` (lines 19–21)
`SunCalc.getMoonTimes` and `SunCalc.getTimes` are called on every render (which fires every second via the broken interval described in BUG-02). Once the timer is fixed, cache the day-level calculations (sun/moon rise/set) in a `useMemo` keyed on the current calendar date and only recalculate once per day.

### PERF-04 — `html5-qrcode` (~300 KB) imported unconditionally on the check-in page

**File:** `pages/stargazing/checkin.tsx`
The QR scanner library is bundled into the initial JS payload even though check-in is an admin-only page. Wrap the component in `next/dynamic({ ssr: false })` so the library is only loaded on demand.

### PERF-05 — Duplicate `lodash` and `lodash-es` in production dependencies

**File:** `package.json` (lines 33–34)
Only `lodash-es` (tree-shakeable ESM build) is actually imported in source. The CJS `lodash` package is unused in production code and should be removed or moved to `devDependencies`.

### PERF-06 — Manual `new Image()` preload in `PhotoHeader` instead of Next.js `priority`

**File:** `components/pages/photos/photo-header/PhotoHeader.tsx` (lines 78–88)
Manual image preloading via `new window.Image()` bypasses the Next.js image pipeline. Replace with `<Image priority>` on the hero image and remove the manual preload effect.

---

## Accessibility

### A11Y-01 — `maximum-scale=1` in viewport meta disables user zoom (WCAG 1.4.4 violation)

**File:** `pages/_app.tsx` (line 63)
`maximum-scale=1` prevents users from zooming on mobile. WCAG 1.4.4 requires content to be resizable up to 200% without loss of functionality. Remove `maximum-scale=1` and `shrink-to-fit=no` from the viewport meta tag.

### A11Y-02 — Site logo image and user avatar have empty `alt` text

**File:** `components/common/app-layout/app-header/AppHeader.tsx` (lines 77, 111)
Both images are inside interactive elements (navigation link and menu trigger) and have `alt=""`. Screen readers will announce the controls with no accessible name. Provide descriptive `alt` text for both, e.g. the site name for the logo and the user's name / "User menu" for the avatar.

### A11Y-03 — Menu close overlay `<div role="button">` has no `aria-label`

**File:** `components/common/app-layout/AppLayout.tsx` (line 76)
The transparent overlay that closes the mobile menu is announced as "button" with no context. Add `aria-label={t('common.closeMenu', 'Close menu')}`.

### A11Y-04 — Camera lightbox trigger button has no accessible name

**File:** `components/pages/observatory/camera/Camera.tsx` (lines 59–74)
The button that opens the camera image in a lightbox contains only a spinner and an image but no accessible label. Add `aria-label` describing the action (e.g. "Open camera image in full size").

### A11Y-05 — Relay toggle buttons do not announce which relay they control

**File:** `components/pages/observatory/relay-list/RelayList.tsx` (lines 124–128, 157–159)
Button text is just `"on"` / `"off"` with no surrounding context. A screen-reader user cannot identify which relay will be toggled. Add `aria-label` including the relay name (e.g. "Turn Telescope power on").

### A11Y-06 — `404` page has no layout, no navigation, and no link back to home

**File:** `pages/404.tsx`
The 404 page renders bare text with no `AppLayout`, no navigation links, and no way for the user to reach the rest of the site. Wrap in `AppLayout` and add a prominent "Return to home" link.

---

## Localization (i18n)

### I18N-01 — `EventUpcoming.tsx` contains ~30 hardcoded Russian strings

**File:** `components/pages/stargazing/event-upcoming/EventUpcoming.tsx`
Timezone notice, QR code instructions, map links, ticket status messages ("All tickets sold out", "Registration opens in...", "Registration closed"), booking cancellation section, and the cancel confirmation dialog are all hardcoded in Russian. Extract every visible string to `t()` calls and add corresponding keys to both `ru` and `en` locale files.

### I18N-02 — `EventBookingForm.tsx` contains entirely hardcoded Russian UI

**File:** `components/pages/stargazing/event-upcoming/event-booking-form/EventBookingForm.tsx`
All labels, select options ("Взрослых", "Детей", age selector), error messages, success message, and the submit button label ("Забронировать") are hardcoded in Russian. Fully localise this form.

### I18N-03 — `checkin.tsx` has no localisation at all

**File:** `pages/stargazing/checkin.tsx`
Page title, breadcrumb, all status messages ("Participant registered", "Invalid QR code", "No cameras found"), and counts display are hardcoded in Russian. Add `useTranslation` and `getStaticProps`/`getServerSideProps` for namespace loading, and extract all strings.

### I18N-04 — `Weather.tsx` calls `t(key)` with raw object property names — sensor labels never translate

**File:** `components/pages/observatory/weather/Weather.tsx` (line 98)
Sensor labels are passed directly as bare strings (`'temperature'`, `'humidity'`, etc.) to `t()`. These are not valid i18n keys and will render as the raw key name. Map them to proper namespaced keys (e.g. `t('observatory.sensors.temperature')`) and add entries to locale files.

### I18N-05 — `pages/404.tsx` has no localisation

**File:** `pages/404.tsx`
The page title and all body text are hardcoded Russian strings with no `useTranslation`. Add translation support and provide both `ru` and `en` values.

### I18N-06 — English plural form `minutes_one` has same value as `minutes_other`

**File:** `public/locales/en/translation.json`
`common.minutes_one` and `common.minutes_other` are both `"{{count}} minutes"`. The singular form should be `"{{count}} minute"`. Audit all `_one`/`_other` pairs in the English locale for similar typos.

---

## Code Quality

### CODE-01 — Remove ~80 lines of commented-out JSX in `EventUpcoming.tsx`

**File:** `components/pages/stargazing/event-upcoming/EventUpcoming.tsx` (lines 287–373)
Dead code from an old Semantic UI implementation. Remove it. Also remove the commented-out statistic endpoints in `api/api.ts` (lines 314–331) and the unused `eventGetUsersList` query definition.

### CODE-02 — Replace `window.location.reload()` with RTK Query tag invalidation

**File:** `components/pages/stargazing/event-upcoming/EventUpcoming.tsx` (line 242)
A full-page reload is used after successful booking submission. Instead, invalidate the `UPCOMING` cache tag so RTK Query refetches only the necessary data without a navigation event.

### CODE-03 — Remove `'use client'` directive from Pages Router file

**File:** `pages/stargazing/checkin.tsx` (line 1)
`'use client'` is an App Router directive and is silently ignored in the Pages Router. Remove it to avoid misleading future contributors.

### CODE-04 — Remove the broken `next export` script

**File:** `package.json` (line 13)
`next export` was removed in Next.js 14 and is incompatible with `output: 'standalone'`. The script will throw an error if run. Remove it.

### CODE-05 — Add `Object.hasOwn` guard to `encodeQueryData`'s `for...in` loop

**File:** `api/api.ts` (lines 14–20)
`for...in` iterates inherited prototype properties. Add `Object.hasOwn(data, d)` inside the loop as a safety guard.

### CODE-06 — Rename `ApiModel.Object` to avoid shadowing the global `Object`

**File:** `api/models/object.ts` (line 3)
The exported type named `Object` shadows the built-in JavaScript `Object` in any file that imports `ApiModel`. Rename to `ApiModel.CelestialObject` (or similar) and update all references.

### CODE-07 — Move all inline `style={{}}` usages to SASS modules

Multiple components use inline styles for spacing and layout (e.g. `pages/stargazing/[name].tsx` lines 113, 118; `EventUpcoming.tsx` lines 114, 250–255). Move these to the component's existing `.module.sass` file for consistency with the rest of the codebase.

---

## SEO

### SEO-01 — OpenGraph image paths reference files that do not exist

**Files:** `pages/objects.tsx` (line 113), `pages/photos.tsx` (line 93), `pages/observatory.tsx` (line 30)
The OG image props point to `/screenshots/*.jpg` paths which have no corresponding files in `public/`. Social preview cards will show no image. Either create the screenshots and place them in `public/screenshots/` or update the paths to existing images.

### SEO-02 — Index page (`/`) has no canonical tag

**File:** `pages/index.tsx`
No `canonical` prop is passed to `AppLayout`. Since the site serves both `ru` and `en` locale variants, the absence of a canonical URL can create duplicate-content issues with search engines. Pass `canonical="/"` (or the full absolute URL) to `AppLayout`.
