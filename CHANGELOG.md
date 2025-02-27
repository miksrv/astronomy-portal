# Changelog

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
