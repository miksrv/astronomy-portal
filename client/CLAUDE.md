# CLAUDE.md — Frontend Quick Reference

This file supplements the root `CLAUDE.md`. It covers frontend-specific conventions and API surface for the `client/` directory.

---

## RTK Query Endpoints (`client/api/api.ts`)

All hooks are auto-generated as `API.use<EndpointName>Query/Mutation()`.

### Comments

| Endpoint            | Hook suffix | Purpose                                                                                                |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `commentsGetList`   | Query       | Fetch comments for an entity (by `entityType` + `entityId`); returns `canReview` / `hasReviewed` flags |
| `commentsGetRandom` | Query       | Fetch random comments for a given `entityType` (used in `ReviewsWidget`)                               |
| `commentsCreate`    | Mutation    | Post a new comment/review with optional `rating`                                                       |
| `commentsDelete`    | Mutation    | Delete a comment by id                                                                                 |

### Auth

| Endpoint           | Hook suffix | Purpose                                     |
| ------------------ | ----------- | ------------------------------------------- |
| `authGetMe`        | Query       | Fetch the currently authenticated user      |
| `authLoginService` | Mutation    | OAuth login via `google`, `yandex`, or `vk` |
| `authPostLogin`    | Mutation    | Native email/password login                 |

### Categories

| Endpoint            | Hook suffix | Purpose                     |
| ------------------- | ----------- | --------------------------- |
| `categoriesGetList` | Query       | All photo/object categories |

### Events

| Endpoint                       | Hook suffix | Purpose                                   |
| ------------------------------ | ----------- | ----------------------------------------- |
| `eventGetItem`                 | Query       | Single event by id                        |
| `eventGetList`                 | Query       | All events                                |
| `eventGetUpcoming`             | Query       | Next upcoming event (singleton)           |
| `eventGetPhotoList`            | Query       | Photos for a specific event               |
| `eventGetUsersList`            | Query       | Registered members of an event            |
| `eventGetCheckin`              | Mutation    | Check in to an event by id                |
| `eventCreatePost`              | Mutation    | Create a new event (FormData)             |
| `eventPatch`                   | Mutation    | Update event fields                       |
| `eventDelete`                  | Mutation    | Delete an event                           |
| `eventCoverUploadPost`         | Mutation    | Upload event cover image                  |
| `eventUpdateCover`             | Mutation    | Replace event cover (`/events/:id/cover`) |
| `eventPhotoUploadPost`         | Mutation    | Upload photo to event gallery             |
| `eventsRegistrationPost`       | Mutation    | Register for an event                     |
| `eventsCancelRegistrationPost` | Mutation    | Cancel registration for an event          |

### Objects

| Endpoint         | Hook suffix | Purpose                    |
| ---------------- | ----------- | -------------------------- |
| `objectsGetList` | Query       | All astronomical objects   |
| `objectsGetItem` | Query       | Single object by name slug |
| `objectsPost`    | Mutation    | Create object              |
| `objectsPatch`   | Mutation    | Update object              |
| `objectsDelete`  | Mutation    | Delete object              |

### Photos

| Endpoint           | Hook suffix | Purpose                       |
| ------------------ | ----------- | ----------------------------- |
| `photosGetList`    | Query       | Paginated/filtered photo list |
| `photosGetItem`    | Query       | Single photo by id            |
| `photosPost`       | Mutation    | Create photo record           |
| `photoPatch`       | Mutation    | Update photo metadata         |
| `photosPostUpload` | Mutation    | Upload photo file (FormData)  |
| `photosDelete`     | Mutation    | Delete photo                  |

### Relay

| Endpoint         | Hook suffix | Purpose                             |
| ---------------- | ----------- | ----------------------------------- |
| `relayGetState`  | Query       | Current state of all relay channels |
| `relayGetLight`  | Mutation    | Toggle observatory light            |
| `relayPutStatus` | Mutation    | Set a specific relay channel state  |

### Files

| Endpoint       | Hook suffix | Purpose                                   |
| -------------- | ----------- | ----------------------------------------- |
| `filesGetList` | Query       | FITS files for an object (by object name) |

### Equipments

| Endpoint            | Hook suffix | Purpose                         |
| ------------------- | ----------- | ------------------------------- |
| `equipmentsGetList` | Query       | All observatory equipment items |

### Statistic

| Endpoint                | Hook suffix | Purpose                                             |
| ----------------------- | ----------- | --------------------------------------------------- |
| `statisticGetTelescope` | Query       | Telescope session statistics (optional date filter) |

### Mailings

| Endpoint             | Hook suffix | Purpose                             |
| -------------------- | ----------- | ----------------------------------- |
| `mailingGetList`     | Query       | All mailing campaigns (list view)   |
| `mailingGetItem`     | Query       | Single mailing by id                |
| `mailingCreate`      | Mutation    | Create a new mailing draft          |
| `mailingUpdate`      | Mutation    | Update mailing subject/content      |
| `mailingDelete`      | Mutation    | Delete a mailing                    |
| `mailingUploadImage` | Mutation    | Upload header image for a mailing   |
| `mailingTestSend`    | Mutation    | Send a test email for a mailing     |
| `mailingLaunch`      | Mutation    | Send a mailing to all subscribers   |
| `mailingUnsubscribe` | Query       | Unsubscribe a user by email address |

### Users (Members)

| Endpoint         | Hook suffix | Purpose                           |
| ---------------- | ----------- | --------------------------------- |
| `usersGetList`   | Query       | Paginated admin user list         |
| `usersGetEvents` | Query       | Event history for a specific user |

### Sitemap

| Endpoint         | Hook suffix | Purpose                                |
| ---------------- | ----------- | -------------------------------------- |
| `sitemapGetList` | Query       | All sitemap entries (objects + photos) |

---

## Data Models (`client/api/models/`)

Import via `import { ApiModel } from '@/api'`.

| Model                  | Description                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `ApiModel.Category`    | Photo/object category (`id`, `title`, `description`)                                                                   |
| `ApiModel.Comment`     | User review/comment with `rating`, `content`, and nested `author`; `CommentEntityType = 'event' \| 'photo'`            |
| `ApiModel.Equipment`   | Observatory equipment item with `EquipmentType` enum                                                                   |
| `ApiModel.Event`       | Stargazing event with tickets, registration window, cover image, and map links; `EventPhoto` and `EventUser` sub-types |
| `ApiModel.File`        | FITS file record with filter, exposure, gain, offset, ccdTemp                                                          |
| `ApiModel.FilterTypes` | Union of LRGBHOSN filter codes; `ApiModel.Filters` maps each to a `Statistic`                                          |
| `ApiModel.Mailing`     | Email campaign with status, sent/error counts; `MailingListItem` is the list-safe subset                               |
| `ApiModel.Object`      | Astronomical object with RA/DEC, description, and linked statistic/filters                                             |
| `ApiModel.Photo`       | Astrophoto record with file metadata, linked objects, categories, equipment                                            |
| `ApiModel.Relay`       | Observatory relay channel (`id`, `name`, `state`)                                                                      |
| `ApiModel.SiteMap`     | Sitemap entry with `id` and `updated` timestamp                                                                        |
| `ApiModel.Statistic`   | Frames/exposure/fileSize aggregate (shared by Objects and Photos)                                                      |
| `ApiModel.Telescope`   | Raw telescope session row (date, total_exposure, frames_count, catalog_items)                                          |
| `ApiModel.User`        | User profile; `UserRole` enum: `user / security / moderator / admin`; `AdminUserItem` is the admin table shape         |
| `ApiModel.Weather`     | Weather snapshot (temperature, wind, humidity, clouds, UV, solar radiation, etc.)                                      |

---

## Components

### `client/components/common/`

| Component          | Description                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| `AppFooter`        | Site-wide footer                                                                     |
| `AppLayout`        | Root page wrapper — handles SEO (NextSeo), auth dialog, and progress bar             |
| `AppToolbar`       | Top navigation bar with locale switcher and auth state                               |
| `LoginForm`        | OAuth + native login form, used inside a Dialog                                      |
| `MoonPhaseIcon`    | SVG icon that renders the current moon phase                                         |
| `ObjectPhotoTable` | Table of FITS files for an astronomical object                                       |
| `PhotoFilterList`  | Filter chip list for narrowing photo gallery results                                 |
| `PhotoGallery`     | Masonry/grid photo gallery with lazy loading                                         |
| `PhotoLightbox`    | Full-screen photo lightbox with navigation                                           |
| `ReviewCard`       | Displays a single review: avatar, star rating, content, date, optional delete        |
| `ReviewForm`       | Authenticated form to submit a star rating + text review; calls `commentsCreate`     |
| `StarMap`          | Interactive Celestial.js/D3 star map (vanilla JS libs loaded from `public/scripts/`) |
| `VisibilityChart`  | ECharts visibility chart for an astronomical object over a night                     |

### `client/components/pages/stargazing/`

| Component            | Description                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `EventForm`          | Admin create/edit form for a stargazing event; exports `EventFormType`                      |
| `EventItemData`      | Detail block rendering event metadata (date, location, member counts)                       |
| `EventPhotoUploader` | Drag-and-drop photo upload for a specific event                                             |
| `EventReviews`       | Reviews section for an event page: shows `ReviewForm` (if eligible) + list of `ReviewCard`s |
| `EventUpcoming`      | Hero widget for the next upcoming event with registration/cancellation dialog               |
| `EventsList`         | List/grid of all events with status indicators                                              |
| `InfoCards`          | Grid of icon link-cards used on the stargazing index page; accepts `InfoCardItem[]`         |
| `ReviewsWidget`      | Sidebar/homepage widget showing random event reviews via `commentsGetRandom`                |

---

## Mandatory Coding Conventions

### Props interfaces

Always use `interface`, not `type`, for component props:

```ts
// Correct
interface MyComponentProps { ... }

// Wrong
type MyComponentProps = { ... }
```

### i18n

- Default fallback text in `t('key', 'fallback')` must be **Russian**.
- Every new key must be added to **both** locale files:
    - `client/public/locales/en/translation.json` — English text
    - `client/public/locales/ru/translation.json` — proper Russian translation (never copy English)
- Locale files are auto-generated by `yarn locales:build` — do not commit manually edited generated artifacts.

### Prefer `simple-react-ui-kit` over native HTML

| Instead of            | Use           |
| --------------------- | ------------- |
| `<button>`            | `<Button>`    |
| `<input>`             | `<Input>`     |
| `<textarea>`          | `<TextArea>`  |
| Card/section wrappers | `<Container>` |
| Alert/info messages   | `<Message>`   |

### RTK Query error shape

Errors from `.unwrap()` have this shape:

```ts
{
    status: number,
    data: {
        messages: Record<string, string>
    }
}
```

Always read `error.data.messages`, not `error.messages`.

```ts
// Correct
const msg = Object.values(error.data.messages)[0]

// Wrong
const msg = Object.values(error.messages)[0]
```

---

## Verification Checklist

Run all four after any change — CI will catch failures, but run locally first:

```bash
yarn eslint:fix
yarn prettier:fix
yarn test
yarn build
```
