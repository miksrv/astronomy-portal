# FEAT-25 — Admin / Moderator Dashboard

**Status:** Planned  
**Priority:** High  
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)  
**Parallel implementation:** Backend and Frontend can work in parallel once the API contract is agreed.

---

## Overview

A dedicated dashboard page at `/dashboard` for users with role `ADMIN` or `MODERATOR`. The page shows aggregated statistics, near-real-time registration activity during open registration periods, recent reviews, and charts — all styled consistently with the existing observatory charts (`echarts-for-react`, dark theme).

**Key feature:** when a stargazing event has open registration, the dashboard shows a live registration feed (polled every 10–15 seconds via RTK Query) — new registrations appear automatically without page reload.

---

## Business Rules

1. Accessible to roles: `ADMIN`, `MODERATOR`. `SECURITY` role does not have access.
2. SSR auth guard: redirect to `/` if no token or insufficient role.
3. All data is fetched via API — no SSR data prefetch for the live sections (to enable polling).
4. **Polling:** RTK Query `pollingInterval: 12000` (12 seconds) on the live registration feed endpoint. Other sections use standard one-time fetch.
5. Charts use `echarts-for-react` with the same dark theme config as `client/components/pages/observatory/widget-chart/Chart.tsx` — same colors, same font sizes, same grid/tooltip style.
6. The dashboard is linked in the admin user dropdown menu (`AppHeader`).

---

## Backend Tasks

### BE-1 — New Controller: `Dashboard`

**File:** `server/app/Controllers/Dashboard.php`

Auth guard: `isAuth` + `role` in `['admin', 'moderator']`.

---

### BE-2 — `GET /dashboard/stats`

Aggregated totals. No polling needed — fetch once on page load.

**Response:**
```json
{
  "totalUsers": 1240,
  "newUsersThisMonth": 38,
  "totalEvents": 87,
  "totalRegistrations": 4320,
  "averageRating": 4.7,
  "totalReviews": 312
}
```

**SQL hints:**
- `totalUsers`: `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`
- `newUsersThisMonth`: `WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`
- `totalRegistrations`: `SELECT COUNT(*) FROM events_users WHERE deleted_at IS NULL`
- `averageRating`: `SELECT AVG(rating) FROM comments WHERE deleted_at IS NULL AND status = 'visible' AND entity_type = 'event'` — available after FEAT-24; return `null` until then

---

### BE-3 — `GET /dashboard/registrations/chart`

Data for the "Registrations per event" bar chart. Returns the last 12 events with their registration counts, sorted by event date ASC.

**Response:**
```json
{
  "items": [
    { "eventId": "...", "title": "Персеиды 2024", "date": "2024-08-07", "registrations": 142, "checkins": 98 }
  ]
}
```

---

### BE-4 — `GET /dashboard/users/chart`

Data for the "New users per month" line chart. Returns counts grouped by month for the last 12 months.

**Response:**
```json
{
  "items": [
    { "month": "2024-09", "count": 24 },
    { "month": "2024-10", "count": 31 }
  ]
}
```

**SQL:**
```sql
SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
FROM users
WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY month
ORDER BY month ASC
```

---

### BE-5 — `GET /dashboard/live`

The **polled** endpoint. Returns current registration state for the active (upcoming) event.  
Returns `null` if there is no event with open registration right now.

**"Open registration" condition:**
```sql
registration_start < NOW() AND registration_end > NOW() AND date > NOW()
```

**Response:**
```json
{
  "event": {
    "id": "...",
    "title": "Персеиды — Время метеоров",
    "date": "2025-08-07T18:30:00Z",
    "maxTickets": 200,
    "availableTickets": 47,
    "totalAdults": 141,
    "totalChildren": 12,
    "totalRegistrations": 98
  },
  "recentRegistrations": [
    {
      "userId": "...",
      "userName": "Иван П.",
      "userAvatar": "abc.jpg",
      "adults": 2,
      "children": 1,
      "registeredAt": "2025-07-20T14:23:00Z",
      "isReturning": true
    }
  ]
}
```

**`isReturning`:** `true` if user has attended at least one previous event (`COUNT(events_users) > 1` for this user, excluding current event).

**`recentRegistrations`:** last 20 registrations for the active event, sorted by `created_at DESC`.

**Note:** `totalAdults`, `totalChildren` are computed from `SUM` on active `events_users` rows.

---

### BE-6 — `GET /dashboard/reviews/recent`

Last 10 visible reviews across all events. For the reviews feed section.

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "content": "Было круто!",
      "rating": 5,
      "createdAt": "...",
      "entityType": "event",
      "entityId": "...",
      "entityTitle": "Персеиды 2025",
      "author": { "id": "...", "name": "Мария С.", "avatar": "..." }
    }
  ]
}
```

---

### BE-7 — Routes

```php
$routes->group('dashboard', static function ($routes) {
    $routes->get('stats',                  'Dashboard::stats');
    $routes->get('registrations/chart',    'Dashboard::registrationsChart');
    $routes->get('users/chart',            'Dashboard::usersChart');
    $routes->get('live',                   'Dashboard::live');
    $routes->get('reviews/recent',         'Dashboard::recentReviews');
    $routes->options('(:any)',             static function () {});
});
```

---

## Frontend Tasks

### FE-1 — New page: `client/pages/dashboard/index.tsx`

**SSR auth guard:** redirect to `/` if role is not `ADMIN` or `MODERATOR`.

**Layout:**
```
AppLayout (noindex, nofollow)
  AppToolbar (title="Дашборд")
  [Stats Row]                  ← 6 stat cards in a grid
  [Live Registration Feed]     ← shown only when active registration exists
  [Charts Row]                 ← registrations per event + new users per month
  [Recent Reviews]             ← last 10 reviews with delete action
  AppFooter
```

---

### FE-2 — Stats Row

**File:** `client/components/pages/dashboard/StatsRow.tsx`

6 cards in a CSS grid (3 columns desktop, 2 tablet, 1 mobile):

| Icon | Label | Value |
|------|-------|-------|
| `Users` | Всего пользователей | `totalUsers` |
| `UserPlus` | Новых за месяц | `newUsersThisMonth` |
| `Calendar` | Мероприятий | `totalEvents` |
| `Ticket` | Всего регистраций | `totalRegistrations` |
| `Star` | Средний рейтинг | `averageRating ?? '—'` |
| `Chat` | Отзывов | `totalReviews` |

Each card: icon + label text + large bold number. Same `<Container>` style as the rest of the project.

---

### FE-3 — Live Registration Feed

**File:** `client/components/pages/dashboard/LiveFeed.tsx`

Shown only when `dashboardLive.data?.event` is not null.

**Top summary bar:**
```
[Event title]   Мест осталось: 47 / 200   Взрослых: 141   Детей: 12   Всего: 153
```

**Recent registrations list** (last 20, newest on top):

Each row:
```
[UserAvatar 32px]  [Иван П.]  [Взрослых: 2, Детей: 1]  [3 мин назад]  [Badge: Впервые / Постоянный]
```

- "Впервые" badge (blue) when `isReturning === false`
- "Постоянный" badge (green) when `isReturning === true`
- New rows animate in from top (CSS transition) when polled data changes

**RTK Query polling config:**
```typescript
const { data } = API.useDashboardGetLiveQuery(undefined, {
    pollingInterval: 12000,
    skipPollingIfUnfocused: true  // pause polling when tab is not active
})
```

---

### FE-4 — Charts

**File:** `client/components/pages/dashboard/DashboardCharts.tsx`

Two charts side by side (stacked on mobile), using `echarts-for-react` with the same dark theme as the observatory `Chart.tsx`:
- Same `backgroundColor: '#2c2d2e'`
- Same `borderColor: '#444546'`, `textPrimaryColor: '#e1e3e6'`
- Same grid, tooltip, legend config

#### Chart A — "Регистрации по мероприятиям" (Bar chart)

- X axis: event short titles (truncated to 12 chars), rotated 30°
- Y axis: number of registrations
- Two bar series: "Зарегистрировано" (blue) + "Пришло" (green, `checkins`)
- Last 12 events

```typescript
const chartOption: EChartsOption = {
    backgroundColor: '#2c2d2e',
    // ... same grid/tooltip/legend config as Chart.tsx
    xAxis: { type: 'category', data: items.map(i => truncate(i.title, 12)) },
    yAxis: { type: 'value' },
    series: [
        { name: 'Зарегистрировано', type: 'bar', data: items.map(i => i.registrations), color: '#4a90d9' },
        { name: 'Пришло', type: 'bar', data: items.map(i => i.checkins), color: '#52c41a' }
    ]
}
```

#### Chart B — "Новые пользователи по месяцам" (Line chart)

- X axis: month labels ("Сен 2024", "Окт 2024", …)
- Y axis: number of new users
- One line series with area fill
- Last 12 months

---

### FE-5 — Recent Reviews feed

**File:** `client/components/pages/dashboard/RecentReviews.tsx`

List of last 10 reviews. Each item:
- Author avatar + name
- Entity link (event title → `/stargazing/:id`)
- Rating stars
- Review text (truncated to 120 chars, expandable)
- Date
- "Скрыть" button (sets `status = 'hidden'`, calls `DELETE /comments/:id`)

---

### FE-6 — RTK Query endpoints

```typescript
dashboardGetStats: builder.query<ApiType.Dashboard.Stats, void>({
    query: () => 'dashboard/stats'
}),
dashboardGetLive: builder.query<ApiType.Dashboard.LiveData | null, void>({
    query: () => 'dashboard/live'
}),
dashboardGetRegistrationsChart: builder.query<ApiType.Dashboard.RegistrationsChart, void>({
    query: () => 'dashboard/registrations/chart'
}),
dashboardGetUsersChart: builder.query<ApiType.Dashboard.UsersChart, void>({
    query: () => 'dashboard/users/chart'
}),
dashboardGetRecentReviews: builder.query<{ items: ApiModel.Comment[] }, void>({
    providesTags: ['Comments'],
    query: () => 'dashboard/reviews/recent'
}),
```

### FE-7 — TypeScript types

**File:** `client/api/types/dashboard.ts`

```typescript
export interface Stats {
    totalUsers: number
    newUsersThisMonth: number
    totalEvents: number
    totalRegistrations: number
    averageRating: number | null
    totalReviews: number
}

export interface LiveRegistration {
    userId: string
    userName: string
    userAvatar?: string
    adults: number
    children: number
    registeredAt: string
    isReturning: boolean
}

export interface LiveData {
    event: {
        id: string
        title: string
        date: string
        maxTickets: number
        availableTickets: number
        totalAdults: number
        totalChildren: number
        totalRegistrations: number
    }
    recentRegistrations: LiveRegistration[]
}

export interface RegistrationsChart {
    items: { eventId: string; title: string; date: string; registrations: number; checkins: number }[]
}

export interface UsersChart {
    items: { month: string; count: number }[]
}
```

Export via `client/api/types/index.ts`:
```typescript
export * as Dashboard from './dashboard'
```

### FE-8 — Add Dashboard link in AppHeader

In the admin dropdown, add "Дашборд" → `/dashboard` link. Visible to `ADMIN` and `MODERATOR` roles.

### FE-9 — robots.txt

Add `/dashboard` to `Disallow` in `client/public/robots.txt`.

### FE-10 — i18n keys

Key prefix: `pages.dashboard.*`

```json
{
  "title": "Дашборд",
  "stats.total-users": "Всего пользователей",
  "stats.new-users": "Новых за месяц",
  "stats.total-events": "Мероприятий",
  "stats.total-registrations": "Регистраций",
  "stats.avg-rating": "Средний рейтинг",
  "stats.total-reviews": "Отзывов",
  "live.title": "Регистрация идёт",
  "live.seats-left": "Мест осталось",
  "live.adults": "Взрослых",
  "live.children": "Детей",
  "live.total": "Всего",
  "live.first-time": "Впервые",
  "live.returning": "Постоянный",
  "charts.registrations-title": "Регистрации по мероприятиям",
  "charts.users-title": "Новые пользователи по месяцам",
  "charts.registered": "Зарегистрировано",
  "charts.checkins": "Пришло",
  "reviews.title": "Последние отзывы",
  "reviews.hide": "Скрыть"
}
```

---

## Acceptance Criteria

- [ ] `/dashboard` is accessible only to ADMIN and MODERATOR roles; others redirect to `/`
- [ ] Stats row shows correct aggregated counts
- [ ] Live feed section is hidden when no active registration; shown when registration is open
- [ ] Live feed polls every 12 seconds and shows new registrations without page reload
- [ ] `isReturning` badge correctly distinguishes first-time vs returning participants
- [ ] Bar chart shows last 12 events with registrations vs checkins
- [ ] Line chart shows new users per month for last 12 months
- [ ] Both charts use the same dark theme as the observatory `Chart.tsx`
- [ ] Recent reviews feed shows last 10 reviews with delete/hide action
- [ ] "Дашборд" link is visible in the header dropdown for ADMIN and MODERATOR
- [ ] `/dashboard` is added to `robots.txt` Disallow
- [ ] Polling pauses when browser tab is not active (`skipPollingIfUnfocused: true`)
- [ ] All strings use i18n keys (works in EN and RU)
- [ ] `yarn eslint:fix`, `yarn prettier:fix`, `yarn test`, `yarn build` all pass
