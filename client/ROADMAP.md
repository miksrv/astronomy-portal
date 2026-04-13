# Frontend Audit ROADMAP

Comprehensive security, performance, React/Next.js usage, Redux RTK, TypeScript, and code quality audit of the `client/` directory.

**Total issues found:** 13

- Security: 4
- Redux RTK: 1
- TypeScript: 3 (partially fixed: TS-02 kept `any` with eslint-disable due to RTK Query internal type complexity)
- Code Quality: 16

---

## Security Issues

---

## [SEC-01] Analytics injected via `dangerouslySetInnerHTML` with hardcoded tracker IDs

- **Category:** Security
- **Priority:** High
- **File:** `pages/_app.tsx` (line 104)
- **Description:** The Yandex Metrika and Google Analytics blocks use `dangerouslySetInnerHTML`, bypassing React's XSS sanitization. Real tracker IDs (`93471741`, `G-BGBKSHELMF`) are also hardcoded directly in source code.
- **Recommendation:** Use `next/script strategy="afterInteractive"` for third-party scripts. Move IDs to `NEXT_PUBLIC_YM_ID` and `NEXT_PUBLIC_GA_ID` environment variables.

---

## [SEC-02] Auth token stored in `localStorage` and non-HttpOnly cookie

- **Category:** Security
- **Priority:** High
- **File:** `api/authSlice.ts` (lines 36–41)
- **Description:** The bearer token is written to `localStorage`, making it accessible to any JavaScript on the page — including third-party analytics scripts. The cookie is also set client-side and cannot be `HttpOnly`.
- **Recommendation:** Use only a server-set `HttpOnly SameSite=Strict` cookie for token storage. Remove the `localStorage` storage path entirely.

---

## [SEC-04] Analytics IDs hardcoded in source

- **Category:** Security
- **Priority:** Medium
- **File:** `pages/_app.tsx` (line 105)
- **Description:** Yandex Metrika ID `93471741` and Google Analytics ID `G-BGBKSHELMF` are hardcoded in source code, making rotation or per-environment configuration impossible without a code change.
- **Recommendation:** Move both IDs to `NEXT_PUBLIC_YM_ID` and `NEXT_PUBLIC_GA_ID` environment variables.

---

## [SEC-05] `target="_blank"` links missing `rel="noopener noreferrer"`

- **Category:** Security
- **Priority:** Medium
- **File:** Multiple component files
- **Description:** External links opened with `target="_blank"` do not include `rel="noopener noreferrer"`, exposing the application to tab-nabbing attacks via `window.opener`.
- **Recommendation:** Add `rel="noopener noreferrer"` to every `<a target="_blank">` link throughout the codebase.

---

## Redux RTK Issues

---

## [RTK-06] `APIMeteo` base URL hardcoded

- **Category:** Redux RTK
- **Priority:** Low
- **File:** `api/apiMeteo.ts` (line 8)
- **Description:** The meteo API base URL is hardcoded, making it impossible to configure per-environment without a code change.
- **Recommendation:** Use `process.env.NEXT_PUBLIC_METEO_HOST` for the base URL.

---

## TypeScript Issues

---

## [TS-02] `extractRehydrationInfo` returns `any`

- **Category:** TypeScript
- **Priority:** Medium
- **File:** `api/api.ts`
- **Description:** The `extractRehydrationInfo` function return type is `any`, bypassing type checking for SSR state rehydration. RTK Query's internal `CombinedState` shape is too complex to express without `any`; `unknown` causes a type mismatch. Currently kept with an `eslint-disable` comment and an explanatory comment in code.
- **Recommendation:** Track for a future RTK Query version that may expose a proper type for this callback.

---

## [TS-07] `ImageSlide as any` cast in `PhotoLightbox`

- **Category:** TypeScript
- **Priority:** Low
- **File:** `components/pages/photos/photo-lightbox/PhotoLightbox.tsx` (line 45)
- **Description:** The `ImageSlide` component is cast to `any` to avoid a type mismatch with the `SlideComponent` type.
- **Recommendation:** Type `ImageSlide` to properly implement the `SlideComponent` interface.

---

## [TS-08] ECharts configuration cast to `any` in `Chart.tsx`

- **Category:** TypeScript
- **Priority:** Medium
- **File:** `components/common/chart/Chart.tsx` (lines 176, 205, 234, 242)
- **Description:** Multiple ECharts configuration objects (`baseConfig.series`, `yAxis`) are cast to `any`, losing type safety for chart configuration.
- **Recommendation:** Use ECharts' exported TypeScript types (`SeriesOption`, `YAXisOption`) from the `echarts` package.

---

## Code Quality Issues

---

## [CQ-01] No React error boundaries anywhere in the application

- **Category:** Code Quality
- **Priority:** High
- **File:** `pages/_app.tsx`
- **Description:** There are no React error boundaries in the application. A JavaScript error in any component (e.g., `StarMap`, `VisibilityChart`, `RelayList`) will unmount the entire application tree.
- **Recommendation:** Add an `ErrorBoundary` component wrapping the app in `_app.tsx`. Add additional boundaries around heavy or error-prone components like `StarMapRender` and `VisibilityChart`.

---

## [CQ-02] 80+ lines of commented-out code

- **Category:** Code Quality
- **Priority:** Medium
- **File:** `components/pages/photos/astro-photo-form/AstroPhotoForm.tsx` (lines 24–108), `components/pages/stargazing/event-upcoming/EventUpcoming.tsx` (lines 290–377)
- **Description:** Large blocks of commented-out code remain in production files. This clutters the codebase and confuses future developers about intent.
- **Recommendation:** Delete all commented-out code. Git history preserves it if needed.

---

## [CQ-03] Unresolved TODO comments describing known product bugs

- **Category:** Code Quality
- **Priority:** Medium
- **File:** `components/common/star-map/StarMapRender.tsx`, `components/pages/observatory/relay-list/RelayList.tsx`, `components/pages/stargazing/event-photo-uploader/EventPhotoUploader.tsx`
- **Description:** Multiple TODO comments document known bugs (StarMap resize bug, relay local state issue, upload error notification) without being tracked anywhere.
- **Recommendation:** Convert each TODO to a tracked issue in the project issue tracker and remove the inline comments.

---

## [CQ-04] Donator list sorted on every render in `about.tsx`

- **Category:** Code Quality
- **Priority:** Low
- **File:** `pages/about.tsx` (lines 306–307)
- **Description:** The donator list is sorted inline during render on every call, causing unnecessary computation on each re-render.
- **Recommendation:** Wrap in `useMemo` or pre-sort the JSON data file.

---

## [CQ-05] `normalizeAndFilterObjects` helper buried in a page file

- **Category:** Code Quality
- **Priority:** Low
- **File:** `pages/photos/[name].tsx` (lines 145–179)
- **Description:** A reusable data-normalization utility is defined inside a page component file, making it untestable and inaccessible for reuse.
- **Recommendation:** Move to `utils/photos.ts` and add a unit test.

---

## [CQ-06] `LAT`/`LON` env vars not parsed to `number` in `AstronomyCalc`

- **Category:** Code Quality
- **Priority:** Low
- **File:** `components/pages/observatory/astronomy-calc/AstronomyCalc.tsx`
- **Description:** `process.env.NEXT_PUBLIC_LAT` and `NEXT_PUBLIC_LON` are strings, but astronomy calculations require numbers. Silent NaN propagation is possible if parsing is omitted.
- **Recommendation:** Use `parseFloat(process.env.NEXT_PUBLIC_LAT ?? '51.7')` with a sensible fallback value.

---

## [CQ-07] Admin form redirect fires when `userRole` is `undefined`

- **Category:** Code Quality
- **Priority:** Medium
- **File:** `pages/photos/form.tsx`, `pages/stargazing/form.tsx`
- **Description:** The role-based redirect effect runs before auth state is loaded, causing a redirect to the home page while `userRole` is still `undefined`. Admins are briefly or permanently redirected incorrectly.
- **Recommendation:** Add `if (userRole === undefined) return` at the start of the effect to wait for auth state to load before redirecting.

---

## [CQ-08] Checkin page role check is client-side only

- **Category:** Code Quality
- **Priority:** Medium
- **File:** `pages/stargazing/checkin.tsx`
- **Description:** The admin-only checkin page validates the user role only on the client side after hydration. A non-admin user sees a flash of the protected page before being redirected.
- **Recommendation:** Validate the user role from the JWT cookie in `getServerSideProps` and redirect server-side if unauthorized.

---

## [CQ-09] Inline `style` object props throughout multiple pages

- **Category:** Code Quality
- **Priority:** Low
- **File:** Multiple page and component files
- **Description:** Inline `style={{ }}` object props are used throughout many pages for layout adjustments. These create new object references on every render and cannot be overridden by CSS specificity rules.
- **Recommendation:** Move all inline styles to `.module.sass` CSS modules.

---

## [CQ-10] `AppLayout` selects the entire `application` slice causing unnecessary re-renders

- **Category:** Code Quality
- **Priority:** Medium
- **File:** `components/common/app-layout/AppLayout.tsx`
- **Description:** `AppLayout` selects the entire `application` slice state object. Any change to any field in that slice (e.g., `catalogFilters`) triggers a re-render of the layout, including all children.
- **Recommendation:** Select only the specific fields needed: `showOverlay` and `showAuthDialog` individually using separate `useSelector` calls.

---

## [CQ-11] `secondsUntil*` computed at render scope without a timer update

- **Category:** Code Quality
- **Priority:** Low
- **File:** `components/pages/stargazing/event-upcoming/EventUpcoming.tsx`
- **Description:** Countdown values are computed once at render time and never updated because there is no timer driving re-renders.
- **Recommendation:** Drive countdown values via a `setInterval`-based state update or compute inside a `useMemo` with a timer dependency.

---

## [CQ-12] ~30 hardcoded Russian strings in user-facing pages

- **Category:** Code Quality
- **Priority:** Low
- **File:** `pages/stargazing/checkin.tsx`, `pages/stargazing/entry.tsx`, `components/pages/stargazing/event-upcoming/EventUpcoming.tsx`
- **Description:** Approximately 30 user-facing strings are hardcoded in Russian, bypassing the i18n system and making the application impossible to localize.
- **Recommendation:** Replace all hardcoded Russian strings with `t('key')` calls and add entries to the translation files.

---

## [CQ-13] `PhotoHeader` uses manual `window.Image` preloader instead of `next/image`

- **Category:** Code Quality
- **Priority:** Low
- **File:** `components/pages/photos/photo-header/PhotoHeader.tsx` (lines 78–88)
- **Description:** A manual image preloader is implemented using `new window.Image()` instead of leveraging Next.js's built-in image optimization and preloading via `next/image priority`.
- **Recommendation:** Use `<Image priority />` from `next/image` to handle preloading declaratively.

---

## [CQ-14] `relayGetLight` named with `Get` prefix but is a mutation

- **Category:** Code Quality
- **Priority:** Low
- **File:** `api/api.ts`
- **Description:** The relay light toggle endpoint is named `relayGetLight` (implying a read operation) but is actually a mutation that changes server state.
- **Recommendation:** Rename to `relayTriggerLight` to accurately reflect its state-changing nature.

---

## [CQ-15] Fully static pages use `getServerSideProps` instead of `getStaticProps`

- **Category:** Code Quality
- **Priority:** Medium
- **File:** `pages/about.tsx`, `pages/stargazing/rules.tsx`, `pages/stargazing/faq.tsx`, `pages/stargazing/howto.tsx`, `pages/stargazing/where.tsx`
- **Description:** Pages with no dynamic data use `getServerSideProps`, which runs a server-side function on every request. This adds unnecessary server load and prevents these pages from being statically generated and cached at the CDN.
- **Recommendation:** Change to `getStaticProps` (with `revalidate` if content changes infrequently) so these pages are pre-rendered and served from the CDN.

---

## [CQ-16] `useLocalStorage` does not re-read storage when `key` changes

- **Category:** Code Quality
- **Priority:** Low
- **File:** `hooks/useLocalStorage.ts`
- **Description:** The `useEffect` that reads from `localStorage` does not include `key` in its dependency array. If the key prop changes, the hook continues returning the value from the previous key.
- **Recommendation:** Add `key` to the `useEffect` dependency array.
