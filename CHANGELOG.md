# CHANGELOG

## 4.9.1

### Patch Changes

- Reworked the event ticket confirmation email: the intro now links to `/profile` as a fallback for viewing the ticket if it fails to display, and the date/time block gains a gathering-window line (1.5h, ending 30 minutes before the event starts) plus a separate event end time line
- Push notifications with the "all" audience now also reach anonymous (not-logged-in) subscribers, not just account-claimed ones; fixed `.htaccess` incorrectly caching dynamic API responses
- Fixed `push_notification_deliveries` rows silently disappearing (instead of staying `rejected`) when `system:send-push` removed an expired subscription — the FK was `ON DELETE CASCADE`, so the delivery record vanished along with it, undercounting the campaign's `error_count`; switched to `ON DELETE SET NULL` so the delivery row now survives as a permanent record
- Fixed failed email sends dumping their full SMTP debug output (headers, subject, body) into the shared app log — `system:send-email` and `Mailings::test()` now log a short `warning`-level line with the recipient and mailing/queue ID instead; the full debug dump still goes to the dedicated `email-*.log`
- Removed the unused `longman/telegram-bot` dependency and its `TelegramLibrary` wrapper — the only real caller was an admin alert on failed auto-refunds during event cancellation, which is now just logged (as it already was alongside the alert) instead of also pinging Telegram; added `guzzlehttp/guzzle` as a direct dependency since it was actually needed at runtime as the PSR-18 HTTP client for `minishlink/web-push`, previously pulled in only transitively through the removed package
- Reworked the `email_newsletter` footer: the site link is now a bold "СМОТРИ НА ЗВЁЗДЫ" title over a "Галактика «Млечный Путь», Планета Земля — 51.7°N, 55.0°E" tagline, followed by a Сайт/Telegram/Контакты/Политика конфиденциальности link row and a subscription-reason line above the (now grey, matching the rest of the footer) unsubscribe link
- Extracted the shared HTML shell (head/CSS, 600px centered layout, brand footer) out of `email_newsletter.php`/`email_ticket.php` into a new `email_layout.php` partial to remove duplication; the ticket confirmation email is now the same 600px width as the newsletter (previously full-width/left-aligned) and shares its footer, minus the unsubscribe section which only applies to mailing subscriptions; also fixed `Mailings::renderNewsletterBody()` (used by the campaign preview and test-send endpoints) rendering the wrong view (`email_ticket` instead of `email_newsletter`)
- Fixed `/admin/roles`, `/admin/users`, `/admin/mailing`, and `/admin/push-notifications` getting stuck on an infinite loading skeleton when navigating to the same page again (e.g. clicking its own menu item): the Redux `HYDRATE` handler in `store.ts` was overwriting the entire RTK Query cache slice on every re-navigation instead of merging it per query key, wiping out already-loaded list data for pages whose `getServerSideProps` doesn't prefetch it
- Expand stargazing FAQ on sold-out events

## 4.9.0

### Minor Changes

- Added Web Push notifications: admin campaign management at `/admin/push-notifications` (draft/test/launch, mirroring the email mailing workflow, queue-drained by a new `system:send-push` cron command) plus a user-facing opt-in — a `/profile` toggle and a dismissible site-wide banner shown on `/stargazing` pages that guests can subscribe from before ever logging in, with the subscription automatically claimed by their account on login and every browser/device counted separately
- Fixed `PhotoLightbox` showing a blank/black slide (or briefly, a broken-image icon) while the full-size image loads: the already-loaded preview is now shown behind the full image, which cross-fades in once ready, wired up on the astrophoto detail and stargazing event pages
- Switched `PhotoGallery`'s image rendering from a plain `<img>` to `next/image`, so galleries get automatic AVIF/WebP conversion and on-demand resizing, with aspect-ratio wrapper styles added so fill-mode image rows no longer collapse
- Removed outdated stargazing planning docs (old refactor notes, migration prep instructions, and planned feature specs no longer tracked in-repo)

## 4.8.0

### Minor Changes

- Full access-control refactor: replaced the fixed `admin`/`moderator`/`security` role ENUM with a privilege-based system (`App\Enums\Permission`) — every backend check now tests a specific privilege instead of a hardcoded role name, mirrored on the frontend via `hasPermission()`/`hasAnyPermission()`
- Added admin-editable roles as named bundles of privileges (a user can hold several at once) with a new `/admin/roles` management page and the ability to assign roles to a user from `/admin/users`, including a reserved, single-assignment "Разработчик" role that alone may grant the `users.manage` privilege
- Event photo galleries can now be grouped by photographer: uploads accept a free-text photographer credit, photos carry an EXIF-derived (`DateTimeOriginal`) capture date used for chronological ordering (falling back to upload time when absent), and the event page shows a client-side filter chip row ("Все" + one per photographer) whenever an event has more than one contributor
- Replaced the single-file hidden-input uploader with a batch upload dialog (`EventPhotoUploadDialog`): drag-and-drop or click-to-browse for up to hundreds of files at once, a bounded-concurrency upload queue with an overall progress bar, a non-cumulative "current file" status line alongside a cumulative error list, a Cancel action that aborts in-flight/pending uploads, and a "retry failed only" action once a batch settles — the dialog and the page itself cannot be closed/left while a batch is uploading (new shared `useNavigationGuard` hook)
- Removed the unused bilingual `title_en`/`title_ru` snapshot columns from `events_photos` (a copy of the event's own title taken at upload time, never independently editable); the homepage hero photo strip and the event page now build their own captions from already-loaded data instead
- Replaced the event photo gallery's up-to-500-at-once fetch with real server-side pagination (`limit`/`offset`/`photographer` on `GET /events/photos`, mirroring the comments API): the event page now prefetches only the first 15 photos during SSR, "Смотреть все" loads everything remaining in a single request instead of growing the grid while scrolling, and the distinct photographer list for the filter chips is bundled into the same response rather than a separate endpoint; also fixed `react-photo-album` to actually render photos during SSR (`defaultContainerWidth`), so the gallery is no longer invisible until client-side hydration
- Fixed `PhotoLightbox` showing a blank/black slide (or, briefly, a broken-image icon) while the full-size image loads: the already-loaded thumbnail is now shown as a blurred backdrop underneath, with the full image cross-fading in on load, wired up on the stargazing event and astrophoto detail pages
- Switched `PhotoGallery`'s image rendering from a plain `<img>` to `next/image` (via `react-photo-album`'s `render.image` slot), so every gallery on the site now gets automatic AVIF/WebP conversion and on-demand resizing through `/_next/image` instead of serving the backend's fixed-size preview as-is

## 4.7.5

### Patch Changes

- Added paginated, infinite-scroll loading for stargazing event reviews with new offset/limit support in the comments API; the first page is now prefetched during SSR for SEO, skeleton placeholders replace the old spinner for both initial and infinite-scroll loading, and the review form hides immediately after a successful submit (resetting to page one) instead of waiting on a refetch
- Clarified the event review empty-state message for non-eligible users with a titled info block explaining only registered participants may leave a review, and enriched event JSON-LD to include review entries with a conditional aggregate rating (skipped unless all reviews are loaded)
- Added mailing campaign cancellation: a new `POST /mailings/:id/cancel` endpoint (idempotent, new `canceled` status on `mailings`/`mailing_emails` with migration, race-safe handling of already-queued emails) and a matching admin UI action (destructive "Cancel newsletter" with confirmation dialog for draft/sending campaigns)
- Added a `GET /mailings/:id/preview` admin endpoint that renders the newsletter through the real email template, replacing the old raw content/image preview with an isolated iframe view on the mailing details page
- Revamped the profile page: reworked the reviews section with a dedicated skeleton and a simplified compact list layout, fixed a form-init race so fields resync when user data arrives after the first render, made the card/history/reviews sections tolerate a missing user while auth is still loading, and improved mobile layout (full-width fields and save button below 768px)
- Moved sitemap generation from `pages/sitemap.tsx` to `pages/api/sitemap.ts` (with a rewrite) to avoid a Next.js reserved-route conflict; extended upcoming-booking lookups to include `pending` (not just `confirmed`) bookings, surfacing the payment order/form URL and remaining expiry time for in-flight payments
- Removed the stargazing event archive UI (button/dialog and unused strings) and made backend event deletion reject past events with a localized error; reworked the event form's location block layout and updated README role/permission notes accordingly
- Bumped Next.js to 16.3.0 and refreshed ESLint/TypeScript-ESLint tooling

## 4.7.4

### Patch Changes

- Added an admin-only forced-refund action for paid event registrations: a new `POST /events/registrations/:id/refund` endpoint performs an idempotent synchronous refund via `PaymentLibrary`, cancels the registration on success, returns clear statuses for already-cancelled/already-refunded/not-paid/bank-declined cases, and queues a refund confirmation email (localized EN/RU); the client surfaces it as a grouped verify/refund action with a confirmation dialog, available only for confirmed, active, paid registrations. Documented as admin-only in README and `server/CLAUDE.md`
- Kept the floating stargazing review prompt visible briefly after submission with a thank-you confirmation state before auto-closing
- Shortened the "refunded" registration status label from "Возврат оформлен" to "Возврат"
- Add children age stats to event analytics

## 4.7.3

### Patch Changes

- Reworked the stargazing upcoming event desktop layout so the left media column no longer controls card height (absolutely positioned image content, admin actions staying over the cover, overflow text clipped with a fade), and added a plain-text filler description via a new `removeMarkdownPreserveParagraphs()` string utility
- Added a floating review prompt on stargazing event pages for users who can leave a review, dismissible for 24 hours via a per-event cookie and positioned to avoid overlapping the cookie-consent banner
- Increased the Next.js optimized image cache TTL to one year (uploaded photo filenames are immutable) and updated `robots.txt` to block stargazing payment pages from indexing and collapse tracked Yandex URLs to their canonical form
- Removed the unused `/stargazing/tickets` page and leftover menu/icon remnants from the old tickets/support flow
- Bumped frontend dependencies (Next.js, React, sharp etc.) and fixed icon names on stargazing pages (`Calendar` instead of `Time`, `QuestionCircle` instead of `Compass`)

## 4.7.2

### Patch Changes

- Centralized stargazing registration status handling in a new `eventRegistrations` util (combined status/type mapping, shared ordering, badge/chart colors, localized labels) and reused it across the registrations table and statistics page
- Added a status filter and live filtered count to the event registrations table, combinable with the existing search
- Enhanced event statistics: added a donut chart of registrations by combined status (including refunded), reworked KPI cards with participant subtotals, average group size, remaining seats and a booked-percentage progress bar, and replaced the cumulative timeline line chart with a stacked hourly bar chart split by booking status
- Added a compact "← Parent" mobile breadcrumb link (nearest ancestor, home fallback) alongside the existing full trail, now hidden on small screens
- Tightened mobile footer/toolbar spacing (reduced footer gaps, hid the "made with love" label, adjusted toolbar title line-height)
- Refreshed stargazing FAQ/how-to copy: added a FAQ item about announcing the next trip (Telegram + sign-in/mailing guidance), rewrote start-time/review answers, and updated the how-to timeline text
- Extracted `/auth/me` session sync into a reusable `useAuthSession` hook mounted app-wide, so sliding session expiration and token refresh run on every page load regardless of whether `AppHeader` is rendered
- Fixed stale upcoming-event caching by also invalidating `Events/UPCOMING_PROFILE` alongside `Events/UPCOMING` after payment status changes, BFCache restores, and booking expiration
- Polished the error page layout (full-height centered flex, tighter padding) and refined the 404 background-pan animation, disabling it under `prefers-reduced-motion`

## 4.7.1

### Patch Changes

- Added deploy-time maintenance mode: each deploy workflow (UI, API) sets a lock file on the VPS for the duration of its file swap/restart, and nginx serves a static "please wait" page while either lock is present, so client-only, API-only, and simultaneous deploys all show the same screen until every started job finishes
- Allowed moderators to create, edit, and change the cover image of stargazing events (previously admin-only); archiving/deleting events remains admin-only, and the README roles & permissions tables were tightened to match
- Reworked the event registrations table: merged name/email into a single participant column, added an adults/children column, and replaced the separate payment-status column with a combined booking+payment status (distinct labels/badges for canceled and refunded)
- Updated stargazing FAQ/how-to copy to reflect paid adult tickets (children still free), covering online payment, QR check-in, refunds after cancellation, and a warning that payments only happen through the website
- Fixed mobile layout issues: profile history rows now wrap correctly on small screens (shrunk thumbnails, full-width status line), and stargazing awaiting-payment action buttons stack full-width on mobile
- Improved the star map: fixed live filter/name toggles causing redraw glitches or `undefined` labels, added viewport-responsive resizing via `ResizeObserver` in a new fit-container mode, and corrected popup positioning/arrow alignment when the map is fit to its container
- Reordered stargazing info cards to howto → rules → faq → where

## 4.7.0

### Minor Changes

- Reworked the stargazing event location model: replaced bilingual venue/map-link fields with structured `location`, `address`, `latitude`, `longitude`, `minAge`, and optional `endDate` (schema migration with backfill from legacy data); added a reusable Leaflet-based `EventMap` component (editable marker + reverse geocoding in the event form, read-only embedded map on event pages) and an `EventInfoPanel` showing date/time, age limit, location, participant count, and weather
- Added session-based JWT revocation: a `sid` claim tied to `users.session_token` lets `POST /auth/logout` instantly invalidate every previously issued token across devices without shortening the JWT lifetime
- Added per-IP rate limiting (`RateLimitFilter`) to flood-prone public routes: OAuth login, relay light check, event booking, comment creation, and mailing test send
- Restricted the photo upload endpoint to admins (401 for guests, 403 for non-admin users)
- Redesigned stargazing ticket delivery: `.ics` calendar attachments alongside PNG tickets (new `CalendarLibrary`), a static-template PNG renderer with an embedded check-in QR, and a QR check-in landing page (`/stargazing/checkin/[id]`) for staff scanning
- Hardened payment expiry handling: timed-out payments are now reconciled with the gateway before being marked failed (in batches, oldest first), and `AlfaBankClient` uses explicit connect/request timeouts to avoid indefinite hangs
- Reworked the stargazing booking UI into focused status components (login required, sold out, payment states, registered) with a fully localized booking form, a shared sanitized `PhoneInput` component, and a payment-redirect interim state
- Polished profile and stargazing pages: card-style event history with a correct "visited" badge, an admin event delete dialog, mobile layout fixes for statistics/breadcrumbs, and refreshed EN/RU copy and SEO/JSON-LD

## 4.6.3

### Patch Changes

- Added a `requires_registration` flag for stargazing events (with migration/backfill) so legacy or walk-in events can skip the online booking flow; the client exposes a form toggle and adjusts registration/availability messaging accordingly. Hardened the flag to accept only strict booleans (defaulting to `true`), blocked disabling registration while active bookings exist, and reclassified past events with any booking history (including soft-deleted) as registration-based during backfill
- Surfaced photo upload failures on stargazing event pages: stale errors are cleared, the upload queue stops on the first failed file, and a localized error message with loading state is shown to the user; also fixed the header dropdown menu to respect the full trigger width
- Revamped profile event history from a table into card-style items with cover previews, localized dates/location, and an attended badge
- Enriched profile reviews with event context: each review now shows the event title, date, and cover thumbnail alongside the rating and delete action, replacing the old separate "view event" link
- Improved the profile form: fields now use a responsive two-column grid (collapsing to one column below 768px), a current-page label was added to the profile toolbar breadcrumb, and a helper note reminds users to enter real personal information in the name field
- Refined review card header layout (right-aligned date/delete section) and gave stargazing review widget cards a fixed height for more consistent sizing
- Temporarily hid the observatory history pages (menu, sitemap, and routes return 404) ahead of public launch, keeping the code in place for later re-enabling
- Tightened stargazing info card padding and slightly reduced the global container border radius for a sharper visual style
- Documented a planned web push notifications feature
- Updated client dependencies and lockfile (Next.js, React, i18n, Redux Toolkit, ECharts, and lint/test/format toolchain)

## 4.6.2

### Patch Changes

- Reworked the app header/menu: stable link-based keys, unified active-route matching for nested paths, improved dropdown accessibility (focus/blur handling, ARIA state), safer external links (`noopener/noreferrer`), and a chevron indicator tracking the open state of the user menu popout; moved the language switcher from the header to the footer nav, now showing both locales with active-state styling
- Improved stargazing SEO and accessibility: meaningful alt text and image priority loading, better ARIA semantics for event meta and `ShowMore`, cancellation-aware `Event` JSON-LD with offer details, `ItemList`/`Event` structured data for upcoming and past events, refreshed EN/RU page descriptions, and a safer `sliceText` that avoids cutting words mid-way
- Simplified homepage SEO: removed the redundant `WebSite` JSON-LD block and unused SEO constants, added `WebSite`/`SearchAction` JSON-LD to support object search discovery, and shortened the homepage title copy in EN/RU
- Synced object and photo list filters (`search`, `category`) to the URL with debounced, shallow routing so filtered views are shareable without triggering full SSR reloads
- Moved hero/section heading uppercase styling from translation text to CSS (`hero-label`/`hero-title` mixins) for correct screen reader pronunciation of all-caps text
- Added client-side validation to the review form (required rating, trimmed content, 10–1000 char length, localized field errors, disabled inputs while submitting) and refined the event reviews layout with a consistent top-section separator
- Fixed event view counter initialization so new events start at `views = 0` and increments use `COALESCE(views, 0) + 1`, preventing incorrect counts on legacy rows with `NULL` views
- Raised the event photos limit from 100 to 500 (clamped instead of discarded when out of range) so events with many photos no longer silently return only 20 items

## 4.6.1

### Patch Changes

- Added admin registration management for stargazing events: a registrations table (search, status badges, payment transaction links) and a payment verification action, backed by a new `getRegistrationsByEventId()` model method and typed API endpoints; `EventUpcoming` gained role-based moderation controls (statistic link for moderators, edit/delete with confirmation for admins)
- Enforced booking concurrency safety: a DB migration adds a unique key preventing more than one active (`pending`/`confirmed`) booking per user/event, and a `refunding` payment status enables atomic `paid → refunding` transitions to prevent duplicate gateway refund calls
- Fixed event upcoming/past/conducted status and ordering to use a centralized Orenburg local-day boundary (`ApplicationBaseModel::startOfTodayOrenburg()`) instead of ad-hoc hour offsets
- Reworked the stargazing payment status page to poll and redirect to the profile after successful payment, guard navigation while status checks are in flight, and reuse the shared booking retry flow; removed the separate printable ticket page (`/stargazing/entry`)
- Unified the FAQ, how-to, rules, and location pages onto a shared `StaticInfoPageLayout`, and removed the unused `react-qr-code` dependency
- Fixed and simplified various bugs and improvements: event edit form datetime-local prefill conversion, safer async photo-upload queue with cancellation, unified API error handling (`getErrorMessage`/`ResError`) across login, review, and profile forms, removed the unused profile `UpcomingEventCard` in favor of a compact `EventUpcoming`, added `AppToolbar` meta slot and exported `AppLayoutProps`, refreshed EN/RU locale strings for payment and registration flows, and expanded documentation (README roles & permissions, updated CLAUDE guides)

## 4.6.0

### Minor Changes

- Added stargazing event ticketing and paid bookings via Alfa-Bank acquiring, with a test/production environment switch, QR/PNG ticket rendering, payment status polling, retry and reconciliation for failed or abandoned payments, and alerting on failed refunds
- Added a transactional email queue for reliable delivery of ticket, payment, and login emails
- Added passwordless "magic link" email sign-in as an alternative to OAuth login
- Removed Google as a login option (VK and Yandex remain); hardened VK OAuth with a deterministic PKCE `code_verifier`, clearer failure logging, and switching auth method on repeat login instead of hard-blocking it
- Added a privacy policy page and cookie consent banner
- Reworked the stargazing section: FAQ/How-to/Rules/Where pages, event program and attendance-statistics components, observatory history pages, and a redesigned homepage/hero layout
- Expanded SEO with JSON-LD structured data (`Organization`, `Event`, `FAQPage`, `Article`, `ImageObject`, `BreadcrumbList`) across pages and an improved sitemap with hreflang support
- Refactored UI styling onto shared SASS mixins and theme tokens, with refreshed header, menu, and breadcrumb styles

## 4.5.5

### Patch Changes

- Enhanced SEO metadata in `AppLayout`: canonical URL is now computed from `SITE_LINK` + path and honored even when set to an empty string; added `languageAlternates` (ru, en, x-default) when a canonical is present; set Open Graph type to `"website"` and default Twitter card to `"summary_large_image"`
- Added `BreadcrumbList` JSON-LD structured data to `AppToolbar`: breadcrumb URLs are built with locale prefix (`en/` for English), home title is translated, and the schema is injected into `<Head>` via `dangerouslySetInnerHTML`
- Added `Organization` JSON-LD structured data in `_app.tsx` (name, URL, logo, sameAs links); added canonical prop to the homepage; added homepage URL nodes (`''` and `en/`) to the sitemap with monthly cadence; extended `robots.txt` with Disallow rules for English routes, profile/unsubscribe pages, and stargazing statistic paths
- Added schema.org `Event` JSON-LD to stargazing event detail pages (`/stargazing/[name]`): includes name, description, startDate, location, organizer, image, and URL; injected via `next/head` when event data is available
- Added schema.org `FAQPage` JSON-LD to the stargazing FAQ page (`/stargazing/faq`): built from localized translation strings and injected via `next/head`
- Extended `AuthGuardTest` with additional 401 checks covering photos (`PATCH`/`DELETE`), events (`POST`/`PATCH`/`DELETE`), comments (`POST`/`DELETE`), members endpoints, and mailings (`POST`/`DELETE`)
- Added `CategoryEntityTest` and `EventPhotoEntityTest`: verify attribute casting, default values, datamap aliases, and that `created_at`/`updated_at`/`deleted_at` are included in the dates list
- Added `MailingEmailEntityTest`, `ObjectEntityTest`, and `ObjectFitsFileEntityTest`: cover constant values, default attributes, type casting, date field inclusion, and datamap aliases
- Added `PhotoEntityTest`, `ObservatoryEquipmentEntityTest`, and `ObjectFitsFiltersEntityTest`: verify int/float/string casts, default values for new instances, and datamap alias behavior
- Expanded `AuthHelperTest` with edge-case coverage: `generateAuthToken` produces different tokens for different emails; `validateAuthToken` returns `null` for `null`, empty, malformed, or arbitrary non-JWT strings
- Extended `ApplicationBaseModelTest` with tests for `prepareOutput` field-hiding (`first`/`findAll`) and `generateId` uniqueness and overwrite behavior; added `CommentsModelTest` (reflection-based, no DB) covering private helpers `truncateAuthorName` (empty, whitespace, single/multi-word, Cyrillic, initials) and `formatRows` (camelCase mapping, author object, avatar URL, raw DB field removal, `keepEntity` flag, multi-row formatting)

## 4.5.4

### Patch Changes

- Added stargazing event statistics page (`/stargazing/[name]/statistic`) for admins and moderators: displays attendance breakdown (registered, checked-in, cancelled) and other per-event metrics as ECharts visualizations
- Added `EventStatistic` component with chart and styles for the statistics page
- Added stats link in the events list (`EventsListItem`) visible only to admins and moderators
- Added backend `GET /events/:id/statistic` route and controller action in `Events` controller
- Added `getStatisticByEventId()` method to `EventsUsersModel` returning attendance counts grouped by status
- Added event statistic RTK Query endpoint and response types in `client/api/types/events.ts`
- Extracted shared ECharts base config utility (`client/utils/charts.ts`) and refactored observatory weather chart to use it
- Added EN/RU i18n keys for the event statistics page
- Replaced `NextSeo` component with `generateNextSeo` + `<Head>` across layout and auth/404 pages, completing migration to the custom SEO helper
- Added `noindex`/`nofollow` meta tags to the profile page, event statistics page, and entry page to exclude them from search engine indexing
- Updated client dependencies and lockfile

## 4.5.3

### Patch Changes

- Added audience targeting to email campaigns: a new `Select` on the mailing form lets admins choose between "All Users" (newsletter subscribers) or a specific stargazing event; only events with at least one registered user appear in the list, and each option shows the recipient count in parentheses
- Added new `GET /mailings/audiences` endpoint that returns available audiences with bilingual labels and live recipient counts; event audiences are derived from `events_users` joined with `users`, filtered to valid emails only
- Extended `POST /mailings` and `PATCH /mailings/:id` to accept `audienceType` (`all` | `event`) and `audienceEventId`; `PATCH` resets `audienceEventId` to `null` automatically when switching back to `all`
- Extended `GET /mailings/:id` response with `audienceType`, `audienceEventId`, `audienceLabelRu`, `audienceLabelEn`, and `audienceCount` fields
- Updated `POST /mailings/:id/send` to query event registrants (via `events_users JOIN users`) when `audienceType = 'event'`; the newsletter subscription preference is intentionally not applied for event audiences since attendees opted in explicitly
- Added new database migration `2025-05-20-100000_AddMailingAudience` adding `audience_type ENUM('all','event')` and `audience_event_id VARCHAR(15)` columns to the `mailings` table
- Added audience info row ("Аудитория") to the mailing detail page (`/mailing/[id]`), displayed after the subject row, with label resolved by locale and recipient count; row is hidden for legacy campaigns that predate audience tracking
- Upgraded frontend dependencies: `i18next` 25→26, `react-i18next` 16→17, `next-i18next` 15→16, `typescript` 5→6, `eslint-plugin-simple-import-sort` 12→13, `simple-react-ui-kit` 1.8.4→1.8.6, `@types/node` 24→25; `eslint` held at v9 pending `eslint-plugin-react` v10 support, `next-seo` held at v6 pending v7 API migration
- Updated `tsconfig.json` for TypeScript 6.0: changed `target` from `"es5"` to `"es2017"` (deprecated in TS6) and added explicit `"types": ["node", "jest"]` (TS6 no longer auto-includes `@types/*`)
- Migrated all `next-i18next` imports to the Pages Router subpath (`next-i18next/pages` and `next-i18next/pages/serverSideTranslations`) required by `next-i18next` v16 across ~60 components and pages

## 4.5.2

### Patch Changes

- Fixed mailing stats page returning a blank screen for non-existent campaign IDs — now correctly returns 404 via `getServerSideProps` server-side check
- Added content and image preview to the mailing stats page (`/mailing/[id]`): campaign body text rendered with `white-space: pre-wrap` and header image via Next.js `<Image>`
- Replaced all hardcoded hex colors on the mailing pages with CSS custom properties from `theme.css`
- Extracted email rate-limit constants (`DAY_LIMIT = 2000`, `HOUR_LIMIT = 500`) from `SendEmail` command into a dedicated `Config\MailingLimits` class
- Extended `GET /mailings/:id` API response with `limitDay`, `limitHour`, `sentToday`, and `sentThisHour` fields so the UI can reflect real-time sending capacity
- Added a rate-limit status panel on the mailing stats page: two-column layout showing daily and hourly counters against their limits, a status badge (active / hourly limit reached / daily limit reached), and a live `HH:MM:SS` countdown timer until the limit resets — shown only while the campaign is in `sending` state with recipients remaining
- Added EN/RU i18n keys for the rate-limit panel
- Audited and refactored all 22 backend models for CodeIgniter 4.7.2 compliance: added class-level and method-level PHPDoc to every model, aligned property declaration order to the CI4 canonical form, and set explicit `$useAutoIncrement`, `$useSoftDeletes`, `$protectFields`, and callback declarations throughout
- Fixed `$useAutoIncrement = true` bug in `ObjectFitsFiltersModel` and `PhotosFiltersModel` where the PK is a `VARCHAR`, not an auto-increment integer
- Fixed date format typo in `EventsModel::getPastEventsList()` (`'Y-m-d H:m:s'` → `'Y-m-d H:i:s'`)
- Fixed `ObservatoryEquipmentModel` incorrectly registering a UUID `generateId` callback on an auto-increment integer PK
- Aligned `ObservatorySettingsModel` to extend `ApplicationBaseModel` consistently with all other models
- Refactored `LocalStorage` usage: replaced the `useLocalStorage` hook with the `LocalStorage` utility class across components
- Moved Carousel wrapper class into the component itself and adjusted carousel styles
- Replaced plain hyphen separators with non-breaking space (` `) where used as visual separators; bumped dev dependencies

## 4.5.1

### Patch Changes

- Refactored API `baseQuery` configuration, types, and removed unused `filter` model
- Added environment-based constants for site URL, API URL, and image URL with query parameter encoder utility
- Refactored RTK Query API types: reorganized events, mailings, auth, category, equipment, photos, statistic, and weather types; added dedicated `mailings.ts` types file
- Refactored imports to use `utils` barrel exports and fixed auth token getter
- Improved Redux `HYDRATE` handling and fixed `avatar` URL casting in `UserEntity`
- Fixed RTK Query cache keys, updated event form types and component imports
- Removed deprecated ROADMAP files and feature specification documents
- Updated `CLAUDE.md` documentation: renamed relay hook reference

## 4.5.0

### Minor Changes

- Added reviews and comments system for stargazing events: database migration (`comments` table with soft deletes and star ratings), `CommentsModel` with author privacy (truncated names), `Comments` controller with CRUD endpoints (`GET /comments`, `GET /comments/random`, `POST /comments`, `DELETE /comments/:id`), authentication checks, and server-side language files (EN/RU)
- Added reusable `ReviewCard` component (avatar, star rating, text, date, delete button) and `ReviewForm` component (star selector, text area, inline API validation errors)
- Added `EventReviews` section on the stargazing event detail page displaying user reviews with the ability to submit and delete reviews
- Added `ReviewsWidget` carousel on the stargazing index page showing random reviews fetched from the API
- Added `InfoCards` component for the stargazing index page with key event information displayed as styled cards
- Added user profile page (`/profile`): `ProfileCard` with large avatar and user info, `UpcomingEventCard` showing the nearest registered event with countdown, `EventHistorySection` with past event registrations, and `MyReviewsSection` listing the user's reviews
- Added backend profile API endpoints in `Auth` controller for retrieving and updating the authenticated user's profile, and fetching upcoming registered events
- Added `EventsUsersModel` with method to retrieve upcoming event for a user; extended `Event` and `EventUser` entities with `phone` and `comment` fields
- Added `comment` model and RTK Query API types (`comments.ts`, `auth.ts`), new API endpoints for comments and profile operations, and auth cookie configuration
- Redesigned stargazing index page layout: restructured event list, added info cards section and reviews widget carousel
- Redesigned stargazing event detail page: expanded photo gallery, integrated reviews section, refined `EventUpcoming` component layout
- Extended `UserAvatar` component with `large` size mode (for profile page); added h2 heading style with decorative divider in global styles
- Extended JWT token lifetime in server configuration
- Added foreign key constraint on `comments` table referencing users
- Added EN/RU translation keys for reviews, profile, and updated stargazing pages
- Redesigned stargazing rules and howto pages with improved layout and styling
- Added feature specification documents for upcoming features: admin dashboard, calendar invites, event reminders, i18n booking form, QR email confirmation, waitlist, and user profile
- Added detailed `CLAUDE.md` documentation files for client and server subsystems

## 4.4.0

### Minor Changes

- Added admin Users page (`/users`): paginated, searchable, and sortable list of all registered users with role and auth-type filters, per-column sorting, and a dialog showing each user's event registrations history
- Added `Members` backend controller with two endpoints — `GET /members` (paginated user list) and `GET /members/:id/events` (user events) — both restricted to the admin role
- Added `UsersModel::getUsersList()` with LEFT JOIN on `events_users` and `events` to count active event registrations per user; fixed `eventsCount` sort broken by two bugs: CI4 query builder wrapping the alias in backticks and orphaned bookings from soft-deleted events inflating the count; added stable secondary sort by `u.id`
- Added shared `UserAvatar` UI component with three display modes: image with `onError` fallback, two-letter initials on colored background, and default avatar image; supports `small` (28 px) and `medium` (32 px) sizes; replaced inline `<Image>` avatar usage in `AppHeader` and the Users table
- Added reusable `Pagination` UI component with page-range generation utility (`client/utils/pagination.ts`)
- Added photo view counter: migration adds `views INT UNSIGNED NOT NULL DEFAULT 0` to the `photos` table; `PhotosModel::incrementViews()` increments on each `GET /photos/:id` request; view count is displayed in `PhotoGrid` after the frames field
- Added interactive star map settings panel: configurable display options (stars, constellations, Milky Way, graticule, etc.) with persistence via localStorage; added star map types, constants, popup styles, and hit-testing utilities
- Updated `robots.txt` to disallow indexing of the `/users` admin route
- Extended theme CSS with size CSS custom properties (`--size-control-*`, `--size-badge-*`, `--size-table-*`) for consistent UI kit component sizing
- Refactor StarMapRender: popup, init & interactions
- Add star-map types and constants; add popup styles
- Add star-map utils for popup and hits
- Add StarMap settings UI and defaults
- Add star map settings panel and persistence
- Add star-map settings translations

## 4.3.1

### Patch Changes

- Added `getErrorMessage` utility (`client/utils/errors.ts`) with unit tests to extract human-readable messages from API errors; updated `ResError.messages` type to `Record<string, string>`
- Added `TextArea` for object description field in `AstroObjectForm`; refactored `Weather` component to use typed `WeatherKey`/`WeatherParam`, centralized label and unit maps, and a `weatherParams` array for cleaner rendering
- Replaced imperative `router.push` calls with Button `link` props across objects, photos, and stargazing pages; added success/error message feedback with auto-redirect after object creation
- Added missing weather and UI translation keys to EN/RU locale files
- Added visual divider before the logout item in `AppHeader` for non-user roles
- Refactored Events, Mailings, Objects, and Photos controllers: replaced hard-coded strings with `lang()` keys, standardized error responses, added `try/catch` logging, and split `siteUrl`/`apiUrl` env vars
- Changed mailing image handling: switched from inline attachments to public API image URLs, renamed storage path to `attachments/`, clean up attachments dir on mailing deletion
- Added server-side language files (EN/RU) for Events, Mailings, Objects, Photos, and General modules
- Added unit and feature tests: Entities (`Event`, `EventUser`, `Mailing`, `User`), Helpers (`auth`, `filters`, `locale`), `ApplicationBaseModel`, and `AuthGuard`; updated PHPUnit config to v11.5 with in-memory SQLite test DB
- Added `api-checks.yml` GitHub Actions workflow to run PHP unit tests on pull requests; extended SonarCloud pipeline with PHP coverage reporting
- Fixed comma syntax errors in `AddPhotos` migration

## 4.3.0

### Minor Changes

- Added full email newsletter system (FEAT-1): campaign management (create, edit, delete, launch), per-recipient email queue with cron-driven delivery respecting hourly (500) and daily (2000) SMTP rate limits, test send to admin, image attachment support, and branded HTML email template
- Added unsubscribe flow: public `/unsubscribe` page, `GET /mailings/unsubscribe` API endpoint, audit log in `mailing_unsubscribes`, and `subscribe_newsletter` flag in `users.settings` JSON column
- Added mailing admin UI: list page with status badges, create/edit form with image upload, campaign stats page with auto-refresh polling, and admin-only navigation link in the app header
- Added four database migrations: `mailings`, `mailing_emails`, `mailing_unsubscribes` tables and `settings` JSON column on `users`
- Added event editing support: edit button on the event detail page, PATCH handler extended to cover all fields (dates, map links, location), dedicated cover image replacement endpoint (`POST /events/:id/cover`), and soft delete (archive) with confirmation dialog
- Removed deprecated `Author` controller, model types, and all related RTK Query endpoints from the frontend
- Refactored backend: moved direct `$db` queries from controllers into model methods, extracted Telegram notification logic into `TelegramLibrary`, fixed `Entity` casts (`?datetime` for nullable fields, integer casts for numeric columns), and aligned all models to extend `ApplicationBaseModel`
- Reorganised Next.js pages: moved top-level `photos.tsx`, `objects.tsx`, `observatory.tsx`, and `stargazing.tsx` into their respective subdirectories as `index.tsx` to follow directory-based routing conventions
- Updated `robots.txt` to disallow indexing of mailing admin routes

## 4.2.0

### Minor Changes

- Enforced server-side authentication on all admin-only pages (`/photos/form`, `/objects/form`, `/stargazing/form`, `/stargazing/checkin`) — eliminated flash of protected content
- Moved analytics scripts to `next/script` with `afterInteractive` strategy — replaced `dangerouslySetInnerHTML` injection
- Converted fully static pages (`/about`, `/stargazing/rules`, `/stargazing/faq`, `/stargazing/howto`, `/stargazing/where`) from SSR to SSG with ISR revalidation
- Added VK OAuth session logging and robustness improvements
- Added auth checks, input sanitization, and API response caching across API controllers
- Improved API types, caching tags, and query helper utilities
- Added new API root endpoint and CLI command for recalculating FITS filters
- Updated CORS configuration, routing rules, and filter logic in the API
- Replaced hardcoded Russian strings in stargazing pages with i18n translation keys
- Added 404 page translations for English and Russian locales
- Improved i18n locale coverage and fixed missing translation keys across the UI
- Implemented test suite for ROADMAP code quality tasks
- Resolved multiple code quality issues from audit: removed commented-out code, moved `normalizeAndFilterObjects` to `utils/photos.ts`, added timer-driven countdown in `EventUpcoming`, fixed `useLocalStorage` key dependency
- Updated `robots.txt` to exclude admin and utility routes from indexing
- Improved UI hydration and server-side rendering stability
- Changed UI Dropdown component to Select across forms
- Upgraded UI Dependencies

## 4.1.6

### Patch Changes

- Updated UI Dependencies
- Implemented TelescopeWorkdays UI Table

## 4.1.5

### Patch Changes

- Update EventItemData UI Component
- Added new Interactive mode for StarMap
- Improved ObjectDescription and ImageSlide UI Components
- Added new props for PhotoHeader UI Component
- Improved UI ShowMore Component
- Upgraded UI Dependencies

## 4.1.4

### Patch Changes

- Updated PhotoHeader UI Component
- Upgraded UI Dependencies
- Fixed UI Locales
- Refactoring StarMap page
- Refactoring donaters list in the about page

## 4.1.3

### Patch Changes

- Fixed UI Locale for photo equipment
- Fixed styles for UI photo equipment list

## 4.1.2

### Patch Changes

- Refactoring UI structure
- Improved UI Locales
- Updated UI Dependencies

## 4.1.1

### Patch Changes

- Updated UI Dependencies
- Refactoring UI architecture
- Added UI tests for `cooridates` utils

## 4.1.0

### Minor Changes

- Updated yarn version from `4.8.1` to `4.9.2`
- Removed animate from main page
- Updated UI Libraries
- Fixed UI and API event cancel handlers
- Update EventUpcoming.tsx
- Changed UI event registration
- Fixed API EventsModel and Events
- Separate API endpoints for get Event Data and Event Photo List
- Added API calculating members for each events
- Added new API endpoint for Events - `/events/members/{id}`
- Implemented `EventItemData` UI Component
- Implemented users count in the Events list
- Fixed ESLinter and Prettier
- Upgraded UI Libraries
- Added new UI locales
- Added new UI libraries for generate QR code
- Implemented new UI page - `entry`
- Implemented new UI page - `checkin`
- Added UI styles for print mode
- Improved API DB migrations
- Implemented `QrCodeScanner` UI Component
- Added User Menu Dropdown
- Added new UI API endpoint - `eventGetCheckin`
- Added `location` for API Events Entity
- Added `checkin_at` and `checkin_by_user_id` for API EventUserEntity
- Updated API Migrations
- Implemented API GET `/events/checkin` endpoint
- Added `i18next-scanner` for UI
- Implemented `ApiModel.UserRole` enum for UI
- Added API query `eventGetCheckin` for UI
- Fixed UI objects page user right checks
- Updated UI AppHeader and RelayList Components
- Improved EventUpcoming UI component for new events
- Updated UI photos page right checks
- Updated UI styles, fixed API `locale_helper` function
- Finalize Events
- Update EventUpcoming.tsx
- Fixed EventsModel
- Fixed API upload event images function
- Optimized dimensions for upload event images
- Implemented new UI component - ShowMore
- Improved UI styles

## 4.0.18

### Patch Changes

-  Upgraded UI Libraries
-  Improved UI Server Side Rendering (SSR)
-  Updated i18next and SASS libraries
-  Fixed API Relay switch on
-  Updated Next.js, Sharp and Next SEO libraries
-  Improved UI Server Side Rendering
-  Created API functions for Booking Events
-  Fixed API filters for Photos controller
-  Improved UI dates functions
-  Fixed `logout` UI locales, added plurals locales for time
-  Refactoring UI EventBookingForm
-  Refactoring UI EventUpcoming Component
-  Improved UI AppHeader Components
-  UI Fixed Errors and Bugs
-  Refactoring UI Code-Style
-  Updated UI ESLint and Prettier config

## 4.0.17

### Patch Changes

-  Upgraded UI Libraries
-  Fixed UI styles and CSS Variables
-  Fixed pages router promises
-  Improved components UI styles
-  Fixed button size on the UI forms
-  Removed internal UI Dialog component
-  Fixed API Locales for Objects and Auth Controllers
-  Replaced UI Auth Dialog to Simple UI React Kit Library
-  Improved errors handling for AuthForm

## 4.0.16

### Patch Changes

-  Implemented new API Controller - `Sitemap`
-  Added new API Routes - `/sitemap`
-  Added new UI type and model sitemap
-  Created UI page `/sitemap.xml`
-  Added robot.txt file for UI

## 4.0.15

### Patch Changes

-  HotFix for update Simple UI React Kit - fixed AppHeader Popout

## 4.0.14

### Patch Changes

-  Updated Yarn version
-  Updated UI libraries, added readme for package.json
-  Updated UI locales
-  Removed OLD screenshots
-  Added API Relay Controller and Library locales
-  Improved UI Relay List (added locales)
-  Fixed UI photos and objects error with router navigation
-  Updated README.md

## 4.0.13

### Patch Changes

-   Updated UI Libraries
-   Migrate to React 19
-   Replaced React Gallery library
-   Implemented new UI PhotoGallery Component
-   Replaced old react gallery album component on the all pages
-   Added new property `closeOnSelect` for UI `MultiSelect` component
-   Updated ESLint and Prettier config
-   Fixed all UI code-style

## 4.0.12

### Patch Changes

-   Updated UI Libraries
-   Fixed UI css issues for mobile devices
-   Improved UI Camera component
-   Added loader for UI Photo Header Component (photo page)
-   Improved UI locales
-   Added medium photo for loading photo page screen
-   Fixed photos and objects toolbar styles
-   Implemented category URL for photos page
-   Photo page categories created as links
-   Implemented objects categories page
-   Improved UI photos and objects meta description

## 4.0.11

### Patch Changes

-   Improved UI text locales
-   Fixed UI stargazing pages margins between elements
-   Fixed API stargazing photos count
-   Updated locales
-   Updated UI tools functions and helpers
-   Added and improved UI locales
-   Implemented new UI WidgetChart Component
-   Refactoring styles, components and functions
-   Improved and refactoring UI API models
-   Implemented new UI page, added new menu item
-   Optimized NextJS configuration

## 4.0.10

### Patch Changes

-   Improved UI locales
-   Improved UI starmap, styles and components
-   Improved dropdown UI menu
-   Improved UI pages
-   Changed telegram links
-   Replaced favicon and logo
-   Added new link for UI about page (to observatory overview)
-   Added observatory overview UI page
-   Disabled API Debugbar
-   Added new observatory photos
-   Fixed UI styles for H1 and H2 titles
-   Implemented UI Dropdown Menu
-   Updated UI VisibilityChart
-   Updated UI Libraries

## 4.0.9

### Patch Changes

-   Added blockquote UI styles
-   Added description for UI main page
-   Implemented UI transform RA/DEC coordinates functions
-   Fixed API Events Controller (EventPhotoEntity)
-   Fixed UI stargazing item page footer navigation (for last item)
-   Added UI Coordinates tool
-   Added PHPDoc for some controllers
-   Improved API Deploy GitHub Action
-   Added new UI locales
-   Implemented new UI component - VisibilityChart
-   Added new UI libraries: astronomy-engine, echarts, echarts-for-react
-   Updated UI Libraries
-   Updated API UsersModel.php
-   Fixed API CI/CD

## 4.0.8

### Patch Changes

-   Improved Production CI/CD for API
-   Refactoring and optimization of API Controllers
-   Implemented new Method `getPhotoList` for EventsPhotosModel
-   Added new UI API request `eventGetPhotoList`
-   Added `eventId` and `title` for UI EventPhoto model
-   Added new UI API Types - `RequestPhotoList` and `ResponsePhotoList`
-   Implemented dynamic random photos from API for UI stargazing list page
-   Implemented footer nav for stargazing page
-   Added new UI helper `createPhotoUrl`
-   Added new API Router - `/events/photos`
-   Added `datamap` for API `EventPhotoEntity`

## 4.0.7

### Patch Changes

-   Fixed bug in UI menu scroll
-   Added new fields for API EventsPhotosModel
-   Added new locales for UI
-   Improved UI SEO stargazing photos alt and title
-   Fixed API Controller for upload Events photos

## 4.0.6

### Patch Changes

-   Implemented API Events new methods
-   Added API Photos and Objects rights checks
-   Added new API Routes, improved comments, removed unused constant
-   Implemented UI stargazing event form
-   Added UI API
-   Implemented UI AstroStargazingForm
-   Changed API DB Migrations for Events
-   Improved UI events list styles

## 4.0.5

### Patch Changes

-   Updated node version
-   Fixed CSS import rules
-   Improved robots.txt file
-   Removed CI/CD Release GitHub Action

## 4.0.4

### Patch Changes

-   Fixed UI AppToolbar display in mobile devices
-   Updated UI Library
-   Added title for UI Photo Item page
-   Added blur effect for UI Photo Item page
-   Implemented hidden columns for object photos table
-   Added memoization for UI object photos table

## 4.0.3

### Patch Changes

-   Install new UI dependencies - embla-carousel-react and embla-carousel-auto-scroll
-   Added new UI components - UI Carousel
-   Replaced UI photos for teams members
-   Added new team member
-   Refactoring CSS variables (variables.sass)
-   Refactoring UI Weather Component
-   Refactoring UI RelayList Component

## 4.0.2

### Patch Changes

-   Modified GitHub Actions (added NEXT_PUBLIC_SITE_LINK)
-   Updated UI Libraries
-   Modified UI API - added SITE_LINK constant
-   Implemented Canonical Url for all pages
-   Added nofollow for objects forms
-   Removed duplicated UI OpenGraph title
-   Implemented UI Photo Item page description
-   Implemented description and title for UI Event page
-   Fixed UI index page scroll detection

## 4.0.1

### Patch Changes

-   Fixed UI EventPhoto ApiType
-   Improved UI Events Photos component
-   Fixed UI Events Photos display
-   Removed unused UI react-image-lightbox and react-photo-album
-   Replaces UI Photo Gallery for stargazing page
-   Fixed API Events Controller

## 4.0.0

### Major Changes

-   Updated all UI Libraries
-   Upgraded API Libraries
-   Removed support for old React Semantic UI
-   Migrated UI to a custom-built library
-   Added support for multilingual functionality (English added)
-   Refactored client-side structure for better maintainability
-   Rewritten all core functions for enhanced performance
-   Redesigned and optimized all API controllers
-   Added new pages and forms

