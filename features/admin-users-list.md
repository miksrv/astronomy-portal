# FEAT-2 — Admin Users List

**Status:** Completed  
**Priority:** Medium  
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)  
**Parallel implementation:** Backend and Frontend can work in parallel once the API contract is agreed.

---

## Overview

Add an admin-only page at `/users` listing all registered users. The table shows each user's avatar, name, role, auth service, age/sex, last activity, registration date, and how many stargazing events they've attended. Admins can filter the list and drill into any user's event history via an inline modal.

**Privacy rules:** `email` and `phone` must never be returned by any endpoint in this feature.

---

## No Database Migrations Required

All data lives in existing tables:
- `users` — registration info, activity, demographics, auth type
- `events_users` — per-event registrations (soft-deleted rows = cancelled bookings)
- `events` — event titles and dates

No new columns or tables are needed.

---

## Backend Tasks

### BE-1 — Add `getUsersList()` to `UsersModel`

**File:** `server/app/Models/UsersModel.php`

Add a new query method that returns a paginated, filterable user list with an inline events count. **Never select `email` or `phone`.**

```php
/**
 * Returns a paginated list of users with event attendance count.
 * Email and phone fields are intentionally excluded.
 *
 * @param int    $page     1-based page number
 * @param int    $limit    Rows per page (max 100)
 * @param string $search   Optional name substring search
 * @param string $role     Optional role filter: user|moderator|security|admin
 * @param string $authType Optional auth_type filter: google|yandex|vk|native
 * @return array{ items: array, count: int, page: int, totalPages: int }
 */
public function getUsersList(
    int    $page = 1,
    int    $limit = 20,
    string $search = '',
    string $role = '',
    string $authType = ''
): array
```

**Query logic:**
```sql
SELECT
    u.id,
    u.name,
    u.avatar,
    u.role,
    u.auth_type,
    u.locale,
    u.sex,
    u.birthday,
    u.activity_at,
    u.created_at,
    COUNT(eu.id) AS events_count
FROM users u
LEFT JOIN events_users eu ON eu.user_id = u.id AND eu.deleted_at IS NULL
WHERE u.deleted_at IS NULL
  [AND u.name LIKE '%{search}%'    -- if $search is not empty]
  [AND u.role = '{role}'           -- if $role is not empty]
  [AND u.auth_type = '{authType}'  -- if $authType is not empty]
GROUP BY u.id
ORDER BY u.created_at DESC
LIMIT {limit} OFFSET {(page-1)*limit}
```

**Post-processing in PHP** — calculate `age` from `birthday` before returning:
```php
$age = null;
if (!empty($user->birthday)) {
    $birthDate = new \DateTime($user->birthday);
    $today     = new \DateTime();
    $age       = (int) $birthDate->diff($today)->y;
}
```

**Return shape per item (no email, no phone):**
```php
[
    'id'          => $user->id,
    'name'        => $user->name,
    'avatar'      => $user->avatar,     // filename only, e.g. "abc123.jpg"
    'role'        => $user->role,
    'authType'    => $user->auth_type,
    'locale'      => $user->locale,
    'sex'         => $user->sex,        // 'm' | 'f' | null
    'age'         => $age,              // integer or null
    'activityAt'  => $user->activity_at,
    'createdAt'   => $user->created_at,
    'eventsCount' => (int) $user->events_count,
]
```

---

### BE-2 — Add `getUserEvents()` to `UsersModel`

Add a second method returning the event history for a specific user. Only non-cancelled registrations (`events_users.deleted_at IS NULL`).

```php
/**
 * Returns all events a user has registered for (non-cancelled).
 */
public function getUserEvents(string $userId, string $locale = 'ru'): array
```

**Query logic:**
```sql
SELECT
    e.id,
    e.title_{locale}  AS title,
    e.date,
    eu.adults,
    eu.children,
    eu.checkin_at,
    eu.created_at     AS registered_at
FROM events_users eu
JOIN events e ON e.id = eu.event_id
WHERE eu.user_id = '{userId}'
  AND eu.deleted_at IS NULL
ORDER BY e.date DESC
```

**Return shape per item:**
```php
[
    'id'           => $event->id,
    'title'        => $event->title,
    'date'         => $event->date,
    'adults'       => (int) $eu->adults,
    'children'     => (int) $eu->children,
    'checkinAt'    => $eu->checkin_at,    // null if not checked in
    'registeredAt' => $eu->registered_at,
]
```

---

### BE-3 — Create `Users` Controller

**File:** `server/app/Controllers/Users.php`

New controller — all methods require `ADMIN` role. Use the same auth guard pattern as `Mailings.php`.

```php
namespace App\Controllers;

use App\Libraries\LocaleLibrary;
use App\Libraries\SessionLibrary;
use App\Models\UsersModel;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\RESTful\ResourceController;
use Exception;

class Users extends ResourceController
{
    private SessionLibrary $session;

    public function __construct()
    {
        LocaleLibrary::init();
        $this->session = new SessionLibrary();
    }
    // ...
}
```

#### Method: `list(): ResponseInterface`

- Auth guard: `isAuth` + `role === 'admin'`, else `failUnauthorized` / `failForbidden`
- Read query params (sanitized):
  - `page` — `FILTER_VALIDATE_INT`, min 1, default 1
  - `limit` — `FILTER_VALIDATE_INT`, min 1, max 100, default 20
  - `search` — `FILTER_SANITIZE_FULL_SPECIAL_CHARS`, default `''`
  - `role` — `FILTER_SANITIZE_FULL_SPECIAL_CHARS`, default `''`
  - `authType` — `FILTER_SANITIZE_FULL_SPECIAL_CHARS`, default `''`
- Validate `role` is one of `['', 'user', 'moderator', 'security', 'admin']`
- Validate `authType` is one of `['', 'google', 'yandex', 'vk', 'native']`
- Call `$usersModel->getUsersList(...)` and respond with the result
- Wrap in try-catch, return `failServerError(lang('General.serverError'))` on exception

#### Method: `events(string $id = null): ResponseInterface`

- Auth guard: `isAuth` + `role === 'admin'`
- Validate `$id` is not empty: `failValidationErrors(lang('Users.notFound'))` if missing
- Check user exists: `$usersModel->find($id)` — if null, `failNotFound(lang('Users.notFound'))`
- Fetch via `$usersModel->getUserEvents($id, $locale)`
- Return `$this->respond(['items' => $result])`
- Wrap in try-catch

---

### BE-4 — Add Routes

**File:** `server/app/Config/Routes.php`

Add after the existing groups:

```php
/** Users Controller **/
$routes->group('users', static function ($routes) {
    $routes->get('/', 'Users::list');
    $routes->get('(:alphanum)/events', 'Users::events/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});
```

---

### BE-5 — Add Language Files

**File:** `server/app/Language/en/Users.php` _(new)_

```php
<?php
return [
    'notFound'        => 'User not found.',
    'invalidRole'     => 'Invalid role filter value.',
    'invalidAuthType' => 'Invalid auth type filter value.',
];
```

**File:** `server/app/Language/ru/Users.php` _(new)_

```php
<?php
return [
    'notFound'        => 'Пользователь не найден.',
    'invalidRole'     => 'Неверное значение фильтра роли.',
    'invalidAuthType' => 'Неверное значение фильтра сервиса авторизации.',
];
```

---

## API Contract Summary

| Method | Endpoint                 | Auth  | Description                              |
|--------|--------------------------|-------|------------------------------------------|
| GET    | `/users`                 | ADMIN | Paginated, filterable list of users      |
| GET    | `/users/:id/events`      | ADMIN | List of events a user has registered for |

---

## Request Parameters

### `GET /users`

| Param      | Type   | Default | Description                                      |
|------------|--------|---------|--------------------------------------------------|
| `page`     | int    | 1       | Page number (1-based)                            |
| `limit`    | int    | 20      | Items per page (max 100)                         |
| `search`   | string | `''`    | Filter by name (partial match, case-insensitive) |
| `role`     | string | `''`    | Filter by role: `user\|moderator\|security\|admin` |
| `authType` | string | `''`    | Filter by auth service: `google\|yandex\|vk\|native` |

---

## Response Shapes

### `GET /users`

```json
{
  "count": 150,
  "page": 1,
  "totalPages": 8,
  "items": [
    {
      "id": "abc123",
      "name": "Иван Петров",
      "avatar": "abc123.jpg",
      "role": "user",
      "authType": "google",
      "locale": "ru",
      "sex": "m",
      "age": 34,
      "activityAt": "2026-04-10T12:00:00Z",
      "createdAt": "2024-01-15T09:00:00Z",
      "eventsCount": 7
    }
  ]
}
```

> `avatar` — filename only (e.g. `"abc123.jpg"`). Frontend constructs the full URL using `HOST_IMG` + `/uploads/users/{id}/{avatar}` — the same pattern used elsewhere in the project.
> `age` — integer or `null` if `birthday` is not set.
> `sex` — `"m"`, `"f"`, or `null`.
> `email` and `phone` — **never returned**.

### `GET /users/:id/events`

```json
{
  "items": [
    {
      "id": "event456",
      "title": "Астровыезд #42",
      "date": "2025-11-01T16:00:00Z",
      "adults": 2,
      "children": 1,
      "checkinAt": "2025-11-01T17:05:00Z",
      "registeredAt": "2025-10-15T10:00:00Z"
    }
  ]
}
```

> `checkinAt` — `null` if user was registered but did not check in.

---

## Frontend Tasks

### FE-1 — TypeScript Models

**File:** `client/api/models/user.ts` _(extend existing)_

Add new types without modifying the existing `User` and `UserRole` exports:

```typescript
// Add to client/api/models/user.ts

export type UserAuthType = 'google' | 'yandex' | 'vk' | 'native'

export interface AdminUserItem {
    id: string
    name: string
    avatar?: string
    role: UserRole
    authType: UserAuthType
    locale: string
    sex?: 'm' | 'f'
    age?: number
    activityAt?: string
    createdAt: string
    eventsCount: number
}

export interface AdminUserEvent {
    id: string
    title: string
    date: string
    adults: number
    children: number
    checkinAt?: string
    registeredAt: string
}
```

**File:** `client/api/types/users.ts` _(new)_

```typescript
import { ApiModel } from '@/api'

export interface UsersListRequest {
    page?: number
    limit?: number
    search?: string
    role?: ApiModel.UserRole | ''
    authType?: ApiModel.UserAuthType | ''
}

export interface UsersListResponse {
    count: number
    page: number
    totalPages: number
    items: ApiModel.AdminUserItem[]
}

export interface UserEventsResponse {
    items: ApiModel.AdminUserEvent[]
}
```

Export the new namespace from `client/api/types/index.ts`:
```typescript
export * as Users from './users'
```

---

### FE-2 — RTK Query Endpoints

**File:** `client/api/api.ts`

Add inside the `endpoints` builder, under a `/* Users Controller */` comment:

```typescript
/* Users Controller */
usersGetList: builder.query<ApiType.Users.UsersListResponse, ApiType.Users.UsersListRequest>({
    providesTags: () => [{ id: 'LIST', type: 'Users' }],
    query: (params) => `users${encodeQueryData(params)}`
}),
usersGetEvents: builder.query<ApiType.Users.UserEventsResponse, string>({
    providesTags: (res, err, id) => [{ id, type: 'Users' }],
    query: (id) => `users/${id}/events`
}),
```

Add `'Users'` to the `tagTypes` array.

---

### FE-3 — Users List Page

**File:** `client/pages/users/index.tsx` _(new)_

**SSR auth guard** — same pattern as `client/pages/objects/form.tsx`:
- Read `token` cookie in `getServerSideProps`
- If no token → redirect to `/`
- Fetch `authGetMe` → if `role !== ADMIN` → redirect to `/`

**Page layout:**
```
AppLayout
  AppToolbar (title="Пользователи", breadcrumb)
  [Filters panel]
  [Table]
  [Pagination]
  AppFooter
```

**Filters panel** (renders above the table):
- Text input for `search` (debounce 400ms before firing query)
- `Select` for `role` — options: Все / Пользователь / Модератор / Охрана / Администратор
- `Select` for `authType` — options: Все / Google / Yandex / VK / Нативный

All three filters are reflected in URL query params (via `router.push`) so the page is bookmarkable and browser-back works correctly.

**Table columns** — use `Table` component from `simple-react-ui-kit`:

| Column header   | accessor         | Notes                                              |
|-----------------|------------------|----------------------------------------------------|
| Пользователь    | `name`           | Avatar image + name in one cell (custom formatter) |
| Роль            | `role`           | `Badge` component with color per role              |
| Сервис          | `authType`       | `Badge` or icon — google/yandex/vk/native          |
| Пол / Возраст   | `age`            | `"М, 34"` / `"Ж, 28"` / `"—"` if unknown          |
| Мероприятий     | `eventsCount`    | Number, clickable → opens events modal             |
| Последняя активность | `activityAt` | Relative time via `minutesAgo()` from `@/utils/helpers` |
| Регистрация     | `createdAt`      | Formatted date via `dayjs`                         |

**Role badge colors:**
- `admin` → red/negative
- `moderator` → orange/warning  
- `security` → blue
- `user` → grey (default)

**Auth type badges:**
- `google` → red
- `yandex` → yellow
- `vk` → blue
- `native` → grey

**Loading state:** `Table` has built-in `loading` prop — pass it `isFetching`.

**Empty state:** `Table` has `noDataCaption` prop — set to `t('users.noUsers', 'Нет пользователей')`.

**Pagination:**
- Show `Prev` / `Next` buttons and page number text: `Страница 2 из 8`
- Use `Button` from simple-react-ui-kit with `mode='outline'`
- Controlled by `page` query param in URL

---

### FE-4 — User Events Dialog

**File:** `client/components/pages/users/user-events-dialog/UserEventsDialog.tsx` _(new)_

A modal showing the event history for a specific user. Opens when clicking the `eventsCount` cell in the table.

**Props:**
```typescript
interface UserEventsDialogProps {
    userId?: string          // if undefined, dialog is closed
    userName?: string        // for dialog title
    onClose: () => void
}
```

**Behaviour:**
- Uses `Dialog` from `simple-react-ui-kit` — `open={!!userId}`
- When `userId` is truthy, fires `usersGetEvents(userId)` query (skip if falsy)
- While loading: `Spinner`
- On success: `Table` with columns: Мероприятие, Дата, Взрослых, Детей, Отметка (checkinAt formatted, or "—")
- On error: `Message type="error"` with `getErrorMessage(error)`
- Empty: Table `noDataCaption` = "Пользователь не посещал мероприятий"

**Checkin formatting:**
- If `checkinAt` is set: `"✓ " + formatted time` (green text or positive badge)
- If null: `"—"`

---

### FE-5 — Add Menu Link for Admins

**File:** `client/components/common/app-header/AppHeader.tsx` (or wherever admin dropdown links are rendered)

- Find the user menu/dropdown (same place where "Mailings" link was added in FEAT-1)
- Add **"Пользователи"** link → `/users`
- Visible only when `user?.role === UserRole.ADMIN`
- Add i18n key: `t('menu.users', 'Пользователи')`

---

### FE-6 — i18n Keys

After all UI components are written, add translation keys and run `yarn locales:build`.

Keys to add (minimum set):

```json
{
  "menu.users": "Пользователи",
  "users.pageTitle": "Пользователи",
  "users.search": "Поиск по имени",
  "users.filterRole": "Роль",
  "users.filterAuthType": "Сервис входа",
  "users.filterAll": "Все",
  "users.noUsers": "Нет пользователей",
  "users.columnUser": "Пользователь",
  "users.columnRole": "Роль",
  "users.columnService": "Сервис",
  "users.columnAge": "Пол / Возраст",
  "users.columnEvents": "Мероприятий",
  "users.columnActivity": "Активность",
  "users.columnRegistered": "Регистрация",
  "users.roleUser": "Пользователь",
  "users.roleModerator": "Модератор",
  "users.roleSecurity": "Охрана",
  "users.roleAdmin": "Администратор",
  "users.authGoogle": "Google",
  "users.authYandex": "Yandex",
  "users.authVk": "ВКонтакте",
  "users.authNative": "Нативный",
  "users.eventsDialogTitle": "Мероприятия пользователя",
  "users.eventsColumnEvent": "Мероприятие",
  "users.eventsColumnDate": "Дата",
  "users.eventsColumnAdults": "Взрослых",
  "users.eventsColumnChildren": "Детей",
  "users.eventsColumnCheckin": "Отметка",
  "users.eventsEmpty": "Пользователь не посещал мероприятий",
  "users.checkinDone": "Отмечен",
  "users.pageOf": "Страница {page} из {total}"
}
```

---

### FE-7 — Update `robots.txt`

**File:** `client/public/robots.txt`

Add:
```
Disallow: /users
```

---

## Implementation Order

### Phase 1 — Backend (start first)
1. BE-1: Add `getUsersList()` to `UsersModel`
2. BE-2: Add `getUserEvents()` to `UsersModel`
3. BE-3: Create `Users` controller
4. BE-4: Add routes
5. BE-5: Add language files

### Phase 2 — Frontend (can start in parallel with Phase 1 once API contract is agreed)
1. FE-1: TypeScript models + types
2. FE-2: RTK Query endpoints
3. FE-3: Users list page
4. FE-4: User events dialog component
5. FE-5: Menu link
6. FE-6: i18n keys + `yarn locales:build`
7. FE-7: `robots.txt`

### Phase 3 — Verification
- `yarn eslint:fix` → `yarn prettier:fix` → `yarn test` → `yarn build` — all must pass
- Manual test: open `/users` as admin — table loads, filters work, pagination works
- Manual test: click eventsCount for a user who has attended events — dialog opens with correct data
- Manual test: verify `/users` redirects unauthenticated users to `/`
- Manual test: verify no `email` or `phone` fields appear anywhere in API responses or UI

---

## Acceptance Criteria

- [ ] `GET /users` returns paginated user list; email and phone are **never** present in any response
- [ ] `GET /users/:id/events` returns event history for a user (non-cancelled registrations only)
- [ ] Both endpoints are accessible only to users with `role = admin`; others get 401/403
- [ ] `search` filter works case-insensitively on `name`
- [ ] `role` and `authType` filters correctly narrow results
- [ ] `eventsCount` reflects the number of non-cancelled registrations per user
- [ ] `age` is calculated correctly from `birthday`; `null` if `birthday` not set
- [ ] Frontend page `/users` redirects unauthenticated and non-admin users to `/`
- [ ] Table shows all columns, handles loading and empty states correctly
- [ ] Events dialog opens on clicking `eventsCount`, loads events, shows checkin status
- [ ] Filters update URL query params; page refreshes preserve filter state
- [ ] Pagination works: prev/next buttons, current page shown, disabled at boundaries
- [ ] Admin menu shows "Пользователи" link only for admin role
- [ ] `/users` is blocked in `robots.txt`
- [ ] All user-facing strings use the i18n system
- [ ] `yarn eslint:fix`, `yarn prettier:fix`, `yarn test`, `yarn build` all pass
