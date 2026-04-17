# FEAT-23 — User Personal Cabinet (Profile Page)

**Status:** In Progress  
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
6. **Upcoming event** — the event the user is currently registered for (non-cancelled, date > now). Show date, time, guest count, map links.
7. **Event history** — all past events the user attended (date < now), sorted by date DESC. Reuses the `GET /members/:id/events` endpoint already implemented in FEAT-2.
8. **My Reviews** — placeholder section shown as "Скоро" until FEAT-24 is deployed; after that, shows the user's reviews with delete options.

---

## Backend Tasks

### BE-1 — New endpoint: `PATCH /auth/profile`

**File:** `server/app/Controllers/Auth.php`

**Auth:** required (any authenticated user). Reject unauthenticated with 401.

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
3. Return updated user object (same shape as `GET /auth/me` → `user` key with `id`, `name`, `email`, `phone`, `avatar`, `role`).

**Response `200`:**
```json
{
  "user": { "id": "...", "name": "Иван Петров", "phone": "+79991234567", "email": "...", "avatar": "...", "role": "user" }
}
```

**Error responses:**
- `401` — not authenticated
- `422` — validation failed (return `messages` object)

### BE-2 — New endpoint: `GET /auth/profile/upcoming`

Returns the upcoming event the current user is registered for (non-cancelled, event date > now).

**Auth:** required. Reject unauthenticated with 401.

**Logic:**
```sql
SELECT e.id, e.title_ru, e.title_en, e.date, e.cover_file_name, e.cover_file_ext,
       e.location_ru, e.location_en, e.yandex_map_link, e.google_map_link,
       eu.adults, eu.children, eu.checkin_at
FROM events_users eu
JOIN events e ON e.id = eu.event_id
WHERE eu.user_id = :userId
  AND eu.deleted_at IS NULL
  AND e.date > NOW()
ORDER BY e.date ASC
LIMIT 1
```

Return the event row in camelCase (same format as `Events::show`) or `null` if none found.

**Response:** `{ "item": { ...event fields... } }` or `{ "item": null }`

### BE-3 — Routes

Add to `server/app/Config/Routes.php` inside the existing `auth` group or as standalone routes:

```php
$routes->patch('auth/profile', 'Auth::updateProfile');
$routes->get('auth/profile/upcoming', 'Auth::upcomingEvent');
$routes->options('auth/profile', static function () {});
$routes->options('auth/profile/upcoming', static function () {});
```

These must be declared **before** any catch-all route. Declare before `auth/(:segment)` if that pattern exists.

### BE-4 — Language files

Add to `server/app/Language/ru/App.php`:
```php
'profileUpdated'      => 'Профиль успешно обновлён.',
'profileUpdateFailed' => 'Не удалось обновить профиль.',
```

Add to `server/app/Language/en/App.php`:
```php
'profileUpdated'      => 'Profile updated successfully.',
'profileUpdateFailed' => 'Failed to update profile.',
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

**SSR pattern** — follow the same pattern as `client/pages/stargazing/[name].tsx`:

```typescript
// getServerSideProps
const token = getCookie('token', { req: context.req, res: context.res })
if (!token) {
    return { redirect: { destination: '/auth', permanent: false } }
}
store.dispatch(setSSRToken(token as string))
await store.dispatch(API.endpoints.authGetMe.initiate())
await store.dispatch(API.endpoints.authGetUpcomingEvent.initiate())
// userId is known after authGetMe resolves
await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))
```

**Page layout** (follows the exact structure seen throughout the codebase):
```tsx
<AppLayout title={t('pages.profile.title', 'Personal Cabinet')}>
    <AppToolbar title={t('pages.profile.title', 'Personal Cabinet')} />

    <h2>{t('pages.profile.profile-title', 'Profile')}</h2>
    <ProfileCard />

    <h2>{t('pages.profile.upcoming-event-title', 'Upcoming Event')}</h2>
    <UpcomingEventCard />   {/* or empty state Container when no event */}

    <h2>{t('pages.profile.history-title', 'Event History')}</h2>
    <EventHistorySection userId={user.id} />

    <h2>{t('pages.profile.reviews-title', 'My Reviews')}</h2>
    <Container>
        <p>{t('pages.profile.reviews-coming-soon', 'Your reviews will appear here soon')}</p>
    </Container>

    <AppFooter />
</AppLayout>
```

**Key pattern:** `<h2>` headings are bare elements placed **outside** `<Container>`, directly in the page JSX. They get the global divider-line style automatically (from `globals.sass`). Never wrap `<h2>` inside `<Container>`.

### FE-2 — ProfileCard component

**File:** `client/components/pages/profile/ProfileCard.tsx`

Layout (inside a `<Container>` from `simple-react-ui-kit`):

```
[Avatar — 64px, display only]   [Name: <Input> (editable)]
                                 [Email: <Input disabled> with note below]
                                 [Phone: <Input> (editable, optional)]
                                 [Save <Button mode='primary' size='medium'>]
                                 [Success/error message]
```

**Avatar:** Use `<UserAvatar size='large'>`. This requires adding a `'large'` size (64px) to `UserAvatar` — see FE-9 below.

**Email field:** `<Input disabled value={user.email} />` with a small note below: `t('pages.profile.email-note', 'Email cannot be changed')`

**Save logic:**
```typescript
const [formData, setFormData] = useState({ name: user.name, phone: user.phone ?? '' })
const [updateProfile, { isLoading }] = API.useAuthUpdateProfileMutation()
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
const [saveSuccess, setSaveSuccess] = useState(false)

const handleSave = async () => {
    setSaveSuccess(false)
    setFieldErrors({})
    try {
        await updateProfile({ name: formData.name, phone: formData.phone || undefined }).unwrap()
        setSaveSuccess(true)
    } catch (err) {
        const messages = (err as { data?: { messages?: Record<string, string> } })?.data?.messages
        if (messages) {
            setFieldErrors(messages)
        } else {
            setFieldErrors({ _general: t('pages.profile.save-error', 'Failed to save profile') })
        }
    }
}
```

Show `fieldErrors.name` as `error` prop on the Name `<Input>`.  
Show `fieldErrors._general` or success message below the button (use `<Message>` from `simple-react-ui-kit` or a styled `<p>`).

**Props interface:**
```typescript
interface ProfileCardProps {
    user: ApiModel.User
}
```

### FE-3 — RTK Query endpoints

Add to `client/api/types/auth.ts`:
```typescript
export interface ReqUpdateProfile {
    name: string
    phone?: string
}

export interface ResUpdateProfile {
    user: ApiModel.User
}

export interface ResUpcomingEvent {
    item: ApiModel.Event | null
}
```

Add to `client/api/api.ts`:
```typescript
authUpdateProfile: builder.mutation<ApiType.Auth.ResUpdateProfile, ApiType.Auth.ReqUpdateProfile>({
    invalidatesTags: ['Auth'],
    query: (body) => ({ body, method: 'PATCH', url: 'auth/profile' }),
    transformErrorResponse: (response) => response.data
}),
authGetUpcomingEvent: builder.query<ApiType.Auth.ResUpcomingEvent, void>({
    providesTags: [{ id: 'UPCOMING_PROFILE', type: 'Events' }],
    query: () => 'auth/profile/upcoming'
}),
```

Tag types: Add `'Auth'` to the `tagTypes` array if not already present, and ensure `'Events'` is there.

### FE-4 — UpcomingEventCard component

**File:** `client/components/pages/profile/UpcomingEventCard.tsx`

```typescript
interface UpcomingEventCardProps {
    event: ApiModel.Event
}
```

Inside a `<Container>`:
- Cover image thumbnail (if available) on the left — `<Image>` from `next/image`
- On the right: event title, date (use `formatDate`), adults + children count
- Map links if available: "Яндекс Карты" / "Google Maps" as `<Link>`
- "Cancel booking" button: reuse `API.useEventsCancelRegistrationPostMutation()` — on success, invalidate `authGetUpcomingEvent`

When no upcoming event: show a `<Container>` with `<p className={styles.empty}>` saying `t('pages.profile.no-upcoming-event', 'You have no upcoming events')`.

### FE-5 — Event History section

**File:** `client/components/pages/profile/EventHistorySection.tsx`

```typescript
interface EventHistorySectionProps {
    userId: string
}
```

Use `API.useUsersGetEventsQuery(userId)` (already built in FEAT-2).

Display a simple table via `<Table>` from `simple-react-ui-kit` or a list:
- Columns: event title (as `<Link href={'/stargazing/' + event.id}>`), date, adults + children, checkin badge
- Empty state: `<p>` with `t('pages.profile.history-empty', 'You have not attended any events yet')`

### FE-6 — My Reviews placeholder

```tsx
<h2>{t('pages.profile.reviews-title', 'My Reviews')}</h2>
<Container>
    <p className={styles.comingSoon}>
        {t('pages.profile.reviews-coming-soon', 'Your reviews will appear here soon')}
    </p>
</Container>
```

This section is replaced with real content when FEAT-24's FE-7 is deployed.

### FE-7 — Add "Личный кабинет" link in AppHeader

**File:** `client/components/common/app-layout/app-header/AppHeader.tsx`

In the authenticated user `<Popout>` block, add a profile link **before** the logout `<li>`. It should be visible to **all** authenticated users (all roles).

```tsx
<li>
    <Link href={'/profile'}>
        {t('menu.profile', 'Personal Cabinet')}
    </Link>
</li>
```

Place it:
- After admin links (if admin)
- After QR check link (if moderator/security/admin)
- Before the logout `<li>` (which has the `dividerItem` class for non-USER roles)

For `UserRole.USER` (no admin/mod links), the profile link comes first and the logout link has no divider — so add `dividerItem` to the logout li for ALL roles (including USER), making the profile link always visually separated from logout.

Actually, keep the divider logic as-is: since USER role gets no admin/mod links, simply insert the profile link above the logout li, the visual separation already comes from `dividerItem` applied when role is not USER. Or: always show a divider before logout. Keep it simple.

Add the i18n key `menu.profile` to both locale files:
- EN: `"profile": "Personal Cabinet"`
- RU: `"profile": "Личный кабинет"`

### FE-8 — i18n keys

Key prefix: `pages.profile.*`

**`client/public/locales/en/translation.json`:**
```json
"pages": {
  "profile": {
    "title": "Personal Cabinet",
    "profile-title": "Profile",
    "avatar-note": "Avatar is linked to the authorization service",
    "email-note": "Email cannot be changed",
    "save": "Save",
    "save-error": "Failed to save profile",
    "save-success": "Profile saved",
    "upcoming-event-title": "Upcoming Event",
    "no-upcoming-event": "You have no upcoming events",
    "history-title": "Event History",
    "history-empty": "You have not attended any events yet",
    "reviews-title": "My Reviews",
    "reviews-coming-soon": "Your reviews will appear here soon"
  }
}
```

**`client/public/locales/ru/translation.json`:**
```json
"pages": {
  "profile": {
    "title": "Личный кабинет",
    "profile-title": "Профиль",
    "avatar-note": "Аватар привязан к сервису авторизации",
    "email-note": "Email не может быть изменён",
    "save": "Сохранить",
    "save-error": "Не удалось сохранить профиль",
    "save-success": "Профиль обновлён",
    "upcoming-event-title": "Предстоящее мероприятие",
    "no-upcoming-event": "У вас нет предстоящих мероприятий",
    "history-title": "История мероприятий",
    "history-empty": "Вы ещё не посещали мероприятий",
    "reviews-title": "Мои отзывы",
    "reviews-coming-soon": "Скоро здесь появятся ваши отзывы о мероприятиях"
  }
}
```

Also add to both locale files under `menu`:
- EN: `"profile": "Personal Cabinet"`
- RU: `"profile": "Личный кабинет"`

### FE-9 — Add `'large'` size to UserAvatar

**File:** `client/components/ui/user-avatar/UserAvatar.tsx`

Add `'large'` to the `size` prop type: `size?: 'small' | 'medium' | 'large'`

Update the pixel mapping: `large = 64`.

**File:** `client/components/ui/user-avatar/styles.module.sass`

Add:
```sass
.large
    width: 64px
    height: 64px

    &.initials
        font-size: 24px
```

---

## Styling Notes

### Global H2 style (from `globals.sass`)

```css
h2 {
    font-size: 16px;
    font-weight: 400;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 5px;
}
h2::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--input-border-color);
}
```

The `<h2>` heading automatically gets a horizontal divider line to its right. Place `<h2>` **outside** `<Container>` directly in the page JSX — never inside a `<Container>`.

### SASS modules

Create `client/components/pages/profile/styles.module.sass` for the page and separate module files per component.

---

## Acceptance Criteria

- [ ] `/profile` redirects unauthenticated users to `/auth`
- [ ] Profile card shows avatar (read-only, 64px), name (editable), email (read-only), phone (editable)
- [ ] Saving name/phone calls `PATCH /auth/profile` and shows success/error feedback inline
- [ ] Updated name reflects immediately in the UI without page reload
- [ ] Upcoming event card appears when the user has a future registered event
- [ ] Upcoming event card shows date/time, guest count, map links
- [ ] Cancel booking works from the profile page (invalidates upcoming event query)
- [ ] Event history shows all past attended events via `GET /members/:id/events`
- [ ] "My Reviews" section shows placeholder text (until FEAT-24 FE-7 is deployed)
- [ ] "Личный кабинет" link appears in the user dropdown for all authenticated users
- [ ] All strings use i18n keys (works in EN and RU)
- [ ] `yarn eslint:fix`, `yarn prettier:fix`, `yarn test`, `yarn build` all pass
