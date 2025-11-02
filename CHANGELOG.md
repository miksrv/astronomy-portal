# CHANGELOG

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
