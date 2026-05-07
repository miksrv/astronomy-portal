# CHANGELOG

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
