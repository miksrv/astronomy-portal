# FEAT-24 — Reviews & Comments System

**Status:** Partially Complete — FE-7 blocked on FEAT-23  
**Priority:** High  
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)  
**Parallel implementation:** Backend and Frontend can work in parallel once the API contract is agreed.

---

## Overview

Add a generic reviews/comments system using a single `comments` table designed for multiple entity types. Phase 1 covers event reviews. The schema is architected to support photo comments (and any future entity) without a migration, by using `entity_type` + `entity_id` columns.

Reviews are published immediately (no pre-moderation). Admins and moderators can delete any review. Users can delete their own reviews.

**User-facing touchpoints:**
1. Review form on the event detail page (`/stargazing/:id`) — for eligible users
2. Random review widget on the stargazing index (`/stargazing`) — 3–5 reviews
3. "My Reviews" section on the profile page (`/profile`) — FEAT-23 integration
4. Reminder prompt in the post-event email — FEAT-18 integration
5. Recent reviews feed on the admin dashboard — FEAT-25 integration

---

## Business Rules

### Who can review an event

A user is eligible to review event `E` if they have a row in `events_users` where:
- `user_id = currentUser.id`
- `event_id = E.id`
- `deleted_at IS NULL` (booking not cancelled)
- AND one of:
  - `checkin_at IS NOT NULL` (was scanned at the door), OR
  - event `date < NOW()` (event already happened — covers cases where QR wasn't used)

A user can leave **only one review per event**.

### Review content

- **Text** (`content`): required, min 10 chars, max 1000 chars.
- **Rating** (`rating`): required, integer 1–5 stars. Displayed as stars in the UI.

### Moderation

- Reviews are published immediately (`status = 'visible'`).
- `ADMIN` and `MODERATOR` can set `status = 'hidden'` (soft-hide) or hard-delete.
- Users can delete their own reviews (soft-delete via `deleted_at`).
- No edit after posting — keep it simple.

---

## Database Schema

### Table: `comments`

```sql
CREATE TABLE comments (
    id          VARCHAR(15)                  NOT NULL,
    user_id     VARCHAR(15)                  NOT NULL,
    entity_type ENUM('event', 'photo')       NOT NULL,
    entity_id   VARCHAR(15)                  NOT NULL,
    content     TEXT                         NOT NULL,
    rating      TINYINT UNSIGNED             NULL,        -- 1-5, NULL for non-rated types
    status      ENUM('visible', 'hidden')    NOT NULL DEFAULT 'visible',
    created_at  DATETIME                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at  DATETIME                     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_entity (user_id, entity_type, entity_id),  -- one comment per user per entity
    KEY idx_entity (entity_type, entity_id, deleted_at, status),
    KEY idx_user (user_id, deleted_at)
);
```

### Migration

**File:** `server/app/Database/Migrations/{timestamp}_AddComments.php`

---

## Backend Tasks

### BE-1 — `CommentsModel` ✅ DONE

**File:** `server/app/Models/CommentsModel.php`

Key methods:

```php
// Get comments for an entity, newest first
public function getForEntity(string $type, string $entityId, int $limit = 20): array

// Get random visible comments for an entity type (widget)
public function getRandom(string $type, int $limit = 5): array

// Get comments by a specific user
public function getByUser(string $userId): array

// Check if user is eligible to review an event
public function canReviewEvent(string $userId, string $eventId): bool

// Check if user already reviewed this entity
public function hasReviewed(string $userId, string $type, string $entityId): bool
```

**`canReviewEvent` logic:**
```sql
SELECT COUNT(*) FROM events_users eu
JOIN events e ON e.id = eu.event_id
WHERE eu.user_id = :userId
  AND eu.event_id = :eventId
  AND eu.deleted_at IS NULL
  AND (eu.checkin_at IS NOT NULL OR e.date < NOW())
```

### BE-2 — `Comments` Controller ✅ DONE

**File:** `server/app/Controllers/Comments.php`

#### `GET /comments?entityType=event&entityId=:id&limit=20`

Public endpoint. Returns visible, non-deleted comments for the entity, with author info (name, avatar).

When the request is made by an **authenticated user** and `entityType=event`, the response also includes:
- `canReview` — whether the user is eligible to leave a review (attended event or event is past)
- `hasReviewed` — whether the user has already reviewed this event

**Response (unauthenticated):**
```json
{
  "count": 12,
  "items": [
    {
      "id": "abc",
      "content": "Отличное мероприятие!",
      "rating": 5,
      "createdAt": "2025-08-08T20:00:00Z",
      "author": { "id": "xyz", "name": "Иван П.", "avatar": "abc.jpg" }
    }
  ]
}
```

**Response (authenticated, entityType=event):**
```json
{
  "count": 12,
  "items": [ ... ],
  "canReview": true,
  "hasReviewed": false
}
```

Note: author name is truncated to first name + last initial for privacy (e.g. "Иван П.").

#### `GET /comments/random?entityType=event&limit=5`

Public endpoint. Returns N random visible, non-deleted comments of the given entity type. Used for the widget on `/stargazing`.

#### `POST /comments`

Auth required. Body:
```json
{ "entityType": "event", "entityId": "...", "content": "...", "rating": 5 }
```

Validation:
- `entityType`: one of `['event', 'photo']`
- `entityId`: required, entity must exist
- `content`: required, min_length[10], max_length[1000]
- `rating`: required for `entityType = 'event'`, integer 1–5
- User must be eligible (for events: `canReviewEvent()`)
- User must not have already reviewed this entity (`hasReviewed()`)

#### `DELETE /comments/:id`

Auth required. User can delete their own. ADMIN/MODERATOR can delete any.  
Soft-delete: sets `deleted_at = NOW()`.

### BE-3 — Routes ✅ DONE

```php
$routes->group('comments', static function ($routes) {
    $routes->get('/', 'Comments::index');
    $routes->get('random', 'Comments::random');
    $routes->post('/', 'Comments::create');
    $routes->delete('(:alphanum)', 'Comments::delete/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});
```

### BE-4 — Language files ✅ DONE

```php
// ru
'commentCreated'       => 'Отзыв успешно опубликован.',
'commentDeleted'       => 'Отзыв удалён.',
'commentNotEligible'   => 'Вы можете оставить отзыв только о мероприятии, которое посетили.',
'commentAlreadyExists' => 'Вы уже оставили отзыв об этом мероприятии.',
'commentNotFound'      => 'Отзыв не найден.',
```

---

## API Contract

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/comments?entityType=&entityId=` | Public (optional) | Get comments for entity; adds `canReview`+`hasReviewed` when authenticated and `entityType=event` |
| `GET` | `/comments/random?entityType=&limit=` | Public | Random comments for widget |
| `POST` | `/comments` | Required | Post a new review |
| `DELETE` | `/comments/:id` | Required | Delete own review (or any for admin/mod) |

---

## Frontend Tasks

### FE-1 — TypeScript types ✅ DONE

**File:** `client/api/models/comment.ts`

```typescript
export type Comment = {
    id: string
    content: string
    rating?: number
    createdAt: string
    author: {
        id: string
        name: string
        avatar?: string
    }
}

export type CommentEntityType = 'event' | 'photo'
```

### FE-2 — RTK Query endpoints ✅ DONE

```typescript
commentsGetList: builder.query<
    { count: number; items: ApiModel.Comment[]; canReview?: boolean; hasReviewed?: boolean },
    { entityType: string; entityId: string }
>({
    providesTags: (r, e, { entityId }) => [{ id: entityId, type: 'Comments' }],
    query: (params) => `comments${encodeQueryData(params)}`
}),
commentsGetRandom: builder.query<{ items: ApiModel.Comment[] }, { entityType: string; limit?: number }>({
    providesTags: ['Comments'],
    query: (params) => `comments/random${encodeQueryData(params)}`
}),
commentsCreate: builder.mutation<ApiModel.Comment, { entityType: string; entityId: string; content: string; rating?: number }>({
    invalidatesTags: (r, e, { entityId }) => [{ id: entityId, type: 'Comments' }, 'Comments'],
    query: (body) => ({ body, method: 'POST', url: 'comments' })
}),
commentsDelete: builder.mutation<void, string>({
    invalidatesTags: ['Comments'],
    query: (id) => ({ method: 'DELETE', url: `comments/${id}` })
}),
```

### FE-3 — `ReviewCard` component ✅ DONE

**File:** `client/components/common/review-card/ReviewCard.tsx`

Reusable card showing a single review:
- Author avatar (`UserAvatar size='medium'`) + truncated name
- Star rating via separate `StarRating` sub-component (filled/empty stars based on `rating`)
- Review text
- Date (formatted via `formatDate` utility)
- Delete button (`Button` from `simple-react-ui-kit`, visible only to author or admin/moderator)

### FE-4 — `ReviewForm` component ✅ DONE

**File:** `client/components/common/review-form/ReviewForm.tsx`

```
[Star rating selector: 1–5 clickable star buttons]
[TextArea (simple-react-ui-kit): "Share your experience..." — shows API error via error prop]
[Submit button: "Submit review" — disabled when content is empty or loading]
```

Props: `entityType`, `entityId`, `onSuccess`.

- Uses `TextArea` from `simple-react-ui-kit` (not native `<textarea>`). Validation errors from the API (e.g. field too short) are surfaced via the `error` prop directly on `TextArea`.
- API errors are extracted from `error.data.messages` (RTK Query `.unwrap()` wraps the response body in `{ status, data }`).
- Shown/hidden by the parent `EventReviews` based on `canReview`/`hasReviewed` flags from the API — the form itself has no eligibility logic.

### FE-5 — Reviews section on event detail page (`/stargazing/:id`) ✅ DONE

**File:** `client/components/pages/stargazing/event-reviews/EventReviews.tsx`

Added below the photo gallery section in `[name].tsx`. The `<h2>` section heading lives in the page, not inside the component.

Props: `eventId` only (no `eventDate` — eligibility is determined server-side).

**Visibility logic (API-driven):**
- `canReview` and `hasReviewed` come from `GET /comments` response (only when authenticated)
- `showForm = isAuth && canReview && !hasReviewed`
- When `isAuth && !canReview && !hasReviewed`: show "not eligible" message
- When user has already reviewed (`hasReviewed=true`): no special banner — their review appears in the list with a delete button
- Average rating displayed in page `<h2>` heading: `Reviews ★ 4.8 (12 reviews)`

### FE-6 — Random reviews widget on `/stargazing` ✅ DONE

**File:** `client/components/pages/stargazing/reviews-widget/ReviewsWidget.tsx`

Add between `EventsList` and `AppFooter` on the stargazing index page.  
Fetches 5 random event reviews. Shows them in a horizontal scroll or grid (2–3 columns).  
Title: "Отзывы участников".

### FE-7 — "My Reviews" in profile (FEAT-23 integration) ⏳ BLOCKED — depends on FEAT-23 (User Personal Cabinet)

Replace the placeholder in the profile page with:
- List of user's reviews (using `commentsGetList` filtered by userId — requires backend to support `userId` filter, add it)
- Each item: event title (linked), rating, review text, date, delete button
- Empty state: "Вы ещё не оставляли отзывов. Посетите мероприятие и поделитесь впечатлениями!"

### FE-8 — i18n keys ✅ DONE

Key prefix: `components.common.review-*`

```json
{
  "review-form.title": "Оставить отзыв",
  "review-form.placeholder": "Расскажите о своих впечатлениях...",
  "review-form.rating-label": "Оценка",
  "review-form.submit": "Опубликовать отзыв",
  "review-form.success": "Отзыв опубликован!",
  "review-form.not-eligible": "Вы сможете оставить отзыв после посещения мероприятия",
  "review-card.delete": "Удалить",
  "reviews-widget.title": "Отзывы участников",
  "reviews-section.title": "Отзывы",
  "reviews-section.average": "{{rating}} ({{count}} отзывов)",
  "reviews-section.empty": "Отзывов пока нет. Будьте первым!"
}
```

---

## Post-Event Reminder Integration (FEAT-18)

When FEAT-18 (reminder emails) is implemented, add a second email sent **3 days after the event** to users who attended but have not left a review:

```sql
SELECT eu.user_id FROM events_users eu
LEFT JOIN comments c ON c.user_id = eu.user_id
    AND c.entity_type = 'event' AND c.entity_id = eu.event_id
    AND c.deleted_at IS NULL
WHERE eu.event_id = :eventId
  AND eu.deleted_at IS NULL
  AND c.id IS NULL  -- no review yet
```

Email subject: `«{title}» — как вам мероприятие?`  
Body: link to the event page with the review form anchor.

---

## Acceptance Criteria

- [ ] Migration creates `comments` table with correct schema and indexes
- [ ] `GET /comments` returns visible reviews for an entity with author info
- [ ] `GET /comments/random` returns N random reviews for a widget
- [ ] `POST /comments` creates a review for eligible users
- [ ] Duplicate review from same user for same entity returns 422
- [ ] Ineligible user (no booking or booking cancelled) gets 403
- [ ] `DELETE /comments/:id` soft-deletes own review; admin/mod can delete any
- [ ] Star rating (1–5) is stored and displayed correctly
- [ ] Review form appears on event detail page only when `canReview=true` and `hasReviewed=false` (determined server-side, no client-side date check)
- [ ] Random reviews widget appears on `/stargazing` index
- [ ] "My Reviews" section works in the profile page
- [ ] Author name is truncated for privacy (first name + last initial)
- [ ] Average rating is shown on event page when reviews exist
- [ ] All strings use i18n keys (works in EN and RU)
