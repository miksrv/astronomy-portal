# FEAT-23 — User Personal Cabinet (Profile Page)

**Status:** Planned  
**Priority:** High  
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)  
**Parallel implementation:** Backend and Frontend can work in parallel once the API contract is agreed.

---

## Overview

Add a personal cabinet page at `/profile` for authenticated users. The page lets users view their profile info, edit their name and phone number, see the upcoming event they're registered for, and browse their event history. The "My Reviews" section appears here once FEAT-24 (Reviews) is implemented.

---

## Business Rules

1. Page is accessible only to authenticated users — SSR redirect to `/auth` if no token.
2. **Avatar** — display only, no upload. It is auto-synced from the OAuth provider on login. A tooltip/note explains this.
3. **Email** — display only, cannot be changed (tied to the OAuth service).
4. **Name** — editable. Min 2 chars, max 100 chars.
5. **Phone** — editable, optional. Stored in `users.phone`. Pre-fills the event booking form automatically (already works this way).
6. **Upcoming event** — the event the user is currently registered for (non-cancelled, date > now). Show the same info as `EventUpcoming` but without the booking form — show QR link, date, time, guest count, map links.
7. **Event history** — all past events the user attended (date < now), sorted by date DESC. Reuses the `GET /members/:id/events` endpoint already implemented in FEAT-2.
8. **My Reviews** — placeholder section shown as "Скоро" until FEAT-24 is deployed; after that, shows the user's reviews with edit/delete options.

---

## Backend Tasks

### BE-1 — New endpoint: `PATCH /auth/profile`

**File:** `server/app/Controllers/Auth.php`

**Auth:** required (any authenticated user).

**Request body:**
```json
{ "name": "Иван Петров", "phone": "+79991234567" }
```

**Validation:**
- `name`: required, min_length[2], max_length[100]
- `phone`: optional, max_length[20]

**Logic:**
1. Get `userId` from `$this->session->user->id`.
2. Update `users` table: `name`, `phone`, `updated_at`.
3. Return updated user object (same shape as `GET /auth/me`).

**Response `200`:**
```json
{ "id": "...", "name": "Иван Петров", "phone": "+79991234567", "email": "...", "avatar": "...", "role": "user" }
```

### BE-2 — New endpoint: `GET /auth/profile/upcoming`

Returns the upcoming event the current user is registered for (non-cancelled, event date > now).

**Logic:**
```sql
SELECT e.id, e.title_ru, e.title_en, e.date, e.cover_file_name, e.cover_file_ext,
       e.location, e.yandex_map_link, e.google_map_link,
       eu.adults, eu.children, eu.checkin_at
FROM events_users eu
JOIN events e ON e.id = eu.event_id
WHERE eu.user_id = :userId
  AND eu.deleted_at IS NULL
  AND e.date > NOW()
ORDER BY e.date ASC
LIMIT 1
```

**Response:** single event object or `null`.

### BE-3 — Routes

```php
$routes->patch('auth/profile', 'Auth::updateProfile');
$routes->get('auth/profile/upcoming', 'Auth::upcomingEvent');
$routes->options('auth/profile', static function () {});
$routes->options('auth/profile/upcoming', static function () {});
```

### BE-4 — Language files

Add to `server/app/Language/ru/App.php` and `en/App.php`:
```php
'profileUpdated'      => 'Профиль успешно обновлён.',
'profileUpdateFailed' => 'Не удалось обновить профиль.',
```

---

## API Contract

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/auth/me` | Required | Existing — get current user data |
| `PATCH` | `/auth/profile` | Required | Update name and phone |
| `GET` | `/auth/profile/upcoming` | Required | Get user's next upcoming registered event |
| `GET` | `/members/:id/events` | Required | Existing — get event history (FEAT-2) |

---

## Frontend Tasks

### FE-1 — New page: `client/pages/profile/index.tsx`

**SSR:**
```typescript
// getServerSideProps
if (!token) return { redirect: { destination: '/auth', permanent: false } }
await store.dispatch(API.endpoints.authGetMe.initiate())
// prefetch upcoming event and event history
```

**Layout:**
```
AppLayout
  AppToolbar (title="Личный кабинет")
  [Profile Card]
  [Upcoming Event Card]   // if exists
  [Event History]
  [My Reviews]            // placeholder until FEAT-24
  AppFooter
```

### FE-2 — Profile Card component

**File:** `client/components/pages/profile/ProfileCard.tsx`

Sections in one `<Container>`:

```
[Avatar 64px, display only]  [Name input (editable)]
                              [Email field (readonly, grayed out)]
                              [Phone input (editable)]
                              [Save button]
```

- Avatar: use `<UserAvatar size='medium'>` (already built) but at 64px size — add `'large'` size option to `UserAvatar` props, or pass explicit `className` with custom size.
- Email field: `<Input disabled>` with helper text "Email привязан к сервису авторизации и не может быть изменён"
- On save: call `PATCH /auth/profile` mutation, show success/error message.

### FE-3 — RTK Query endpoints

```typescript
// In api.ts
authUpdateProfile: builder.mutation<ApiModel.User, { name: string; phone?: string }>({
    invalidatesTags: ['Auth'],
    query: (body) => ({ body, method: 'PATCH', url: 'auth/profile' })
}),
authGetUpcomingEvent: builder.query<ApiModel.Event | null, void>({
    providesTags: ['Events'],
    query: () => 'auth/profile/upcoming'
}),
```

### FE-4 — Upcoming Event Card

**File:** `client/components/pages/profile/UpcomingEventCard.tsx`

Condensed version of `EventUpcoming` for the profile page — no booking form, just info:
- Cover image thumbnail (left)
- Title, date/time, guest count (right)
- QR code download link
- Map links (Яндекс / Google)
- "Отменить бронирование" button (reuse existing cancel mutation)

### FE-5 — Event History section

Reuse data from `API.useUsersGetEventsQuery(userId)` (already built in FEAT-2).  
Simple table or list: event title (linked), date, adults + children, checkin badge.

### FE-6 — My Reviews placeholder

```tsx
<Container>
  <h2>Мои отзывы</h2>
  <p className={styles.comingSoon}>Скоро здесь появятся ваши отзывы о мероприятиях</p>
</Container>
```

This section is replaced with real content when FEAT-24 is deployed.

### FE-7 — Add "Личный кабинет" link in AppHeader

In the user dropdown menu (same place as "Выйти"), add a link to `/profile`.

```tsx
{ href: '/profile', label: t('menu.profile', 'Личный кабинет') }
```

Visible to all authenticated users (all roles).

### FE-8 — i18n keys

Key prefix: `pages.profile.*`

```json
{
  "title": "Личный кабинет",
  "avatar-note": "Аватар привязан к сервису авторизации",
  "email-note": "Email не может быть изменён",
  "save": "Сохранить",
  "save-success": "Профиль обновлён",
  "upcoming-event-title": "Предстоящее мероприятие",
  "no-upcoming-event": "У вас нет предстоящих мероприятий",
  "history-title": "История мероприятий",
  "history-empty": "Вы ещё не посещали мероприятий",
  "reviews-title": "Мои отзывы",
  "reviews-coming-soon": "Скоро здесь появятся ваши отзывы о мероприятиях"
}
```

---

## Acceptance Criteria

- [ ] `/profile` redirects unauthenticated users to `/auth`
- [ ] Profile card shows avatar (read-only), name (editable), email (read-only), phone (editable)
- [ ] Saving name/phone calls `PATCH /auth/profile` and shows success/error feedback
- [ ] Updated name/phone is immediately reflected in the UI without page reload
- [ ] Upcoming event card shows when the user has a future registered event
- [ ] Upcoming event card shows QR link, date/time, guest count, map links
- [ ] Cancel booking works from the profile page
- [ ] Event history shows all past attended events, sorted by date DESC
- [ ] "My Reviews" section shows placeholder text (until FEAT-24)
- [ ] "Личный кабинет" link appears in the user dropdown for all authenticated users
- [ ] All strings use i18n keys (works in EN and RU)
- [ ] `yarn eslint:fix`, `yarn prettier:fix`, `yarn test`, `yarn build` all pass
