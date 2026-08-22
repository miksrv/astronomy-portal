# FEAT-25 — Admin Dashboard (`/admin`)

**Status:** Planned
**Priority:** Medium
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)
**Parallel implementation:** Backend and Frontend can work in parallel once the `/admin/overview` response shape is agreed.

---

## Overview

There is currently no landing page for the `/admin/*` section — `client/pages/admin/` only has `mailing/`, `push-notifications/`, `roles.tsx`, and `users.tsx`; the admin dropdown in `AppHeader` links straight into whichever of those a user is permitted to see, with no overview in between. Add `client/pages/admin/index.tsx` (route `/admin`) as that overview: quick links to every admin section the current user can reach, plus a handful of at-a-glance stats for the sections they manage.

This supersedes the earlier draft of this spec, which predated the 4.8.0 privilege-based access-control refactor (it was written against a fixed `admin`/`moderator` role ENUM that no longer exists) and assumed a live-polling registration feed that doesn't fit the domain: stargazing events run about 3 times a year (see "Domain rule: subscription = authentication" in `CLAUDE.md`), so there is no real-time volume to poll for.

---

## Business Rules

1. **No new "dashboard" privilege and no admin bypass** — same rule as everywhere else in the app (see "Maintenance rule: roles & permissions table" in `CLAUDE.md`). `/admin` is visible to a user who holds **at least one** of the privileges already used by the existing `/admin/*` pages (`objects.manage`, `photos.manage`, `mailings.manage`, `push.manage`, `users.manage`, `events.create`, `events.update`, `events.delete`, `events.checkin`, `events.statistic`, `events.refund`, `events.users`). A user with none of these is redirected to `/`.
2. This permission list already exists once, inline, as `AppHeader`'s `adminLinks` array (`client/components/common/app-layout/app-header/AppHeader.tsx`) — it must be extracted to one shared module and imported by both `AppHeader` (dropdown visibility) and the new page (SSR guard + tile list), not duplicated a second time.
3. Each quick-link tile and each stats widget is shown **independently**, gated by the specific privilege it needs — mirrors how `Events::statistic()`, `Mailings::list()`, etc. each check their own privilege inline. A user with only `events.checkin` sees a "Чек-ин" tile and nothing else; they never even issue the requests backing the other widgets.
4. Stats are a plain snapshot fetched once on page load (standard RTK Query, no polling) — no live feed. If real-time visibility into registrations is wanted later during an open-registration window, that's a separate, smaller feature scoped on its own rather than bundled here.
5. No new aggregate table or cron job. Every number either already exists behind an endpoint the frontend can call directly, or is a cheap `COUNT`/`AVG` added to a model that already queries the same table.

---

## Backend Tasks

### BE-1 — Add `total` to `GET /members`

**File:** `server/app/Controllers/Members.php` (`list()`), `server/app/Models/UsersModel.php`

`Members::list()` currently returns `{ items }` only (paginated, no count of the unfiltered total). Add a `total` field (count of all non-deleted users, ignoring `search`/`roleIds` filters) so the dashboard's "Всего пользователей" tile doesn't need its own endpoint. Same `Permission::USERS_MANAGE` guard as today.

### BE-2 — `CommentsModel::getAggregateStats(string $entityType): array`

**File:** `server/app/Models/CommentsModel.php`

```php
public function getAggregateStats(string $entityType): array
{
    $row = $this->select('AVG(rating) as average_rating, COUNT(*) as total')
        ->where(['entity_type' => $entityType, 'status' => 'visible'])
        ->where('rating IS NOT NULL')
        ->first();

    return [
        'averageRating' => $row->average_rating !== null ? round((float) $row->average_rating, 1) : null,
        'total'         => (int) $row->total,
    ];
}
```

No aggregate like this exists yet anywhere in the codebase — this is new, not gated behind any other unbuilt feature.

### BE-3 — New `Dashboard` controller

**File:** `server/app/Controllers/Dashboard.php`
**Route:** `GET /admin/overview` (`server/app/Config/Routes.php`, mirrors the existing `/admin/*`-ish grouping used by `Mailings`/`Roles`)

One endpoint, one response, each top-level key present only if the session holds the privilege it depends on — same inline-check style as every other controller, just checking several privileges in one action instead of one per route:

```php
public function overview(): ResponseInterface
{
    if (!$this->session->isAuth) {
        return $this->respondUnauthorized(lang('App.accessDenied'));
    }

    $data = [];

    if ($this->session->can(Permission::EVENTS_STATISTIC)) {
        $eventsModel      = new EventsModel();
        $eventsUsersModel = new EventsUsersModel();
        $data['events'] = [
            'conductedCount'    => $eventsModel->getConductedCount(),
            'totalParticipants' => $eventsUsersModel->getTotalParticipants(),
            'upcomingCount'     => $eventsModel->where('date >', date('Y-m-d H:i:s'))->countAllResults(),
        ];
    }

    if ($this->session->can(Permission::MAILINGS_MANAGE)) {
        $mailingsModel = new MailingsModel();
        $data['mailings'] = [
            'totalCampaigns' => $mailingsModel->countAllResults(),
            'sendingCount'   => $mailingsModel->where('status', 'sending')->countAllResults(),
        ];
    }

    if ($this->session->can(Permission::PUSH_MANAGE)) {
        $pushModel = new PushNotificationsModel();
        $data['pushNotifications'] = [
            'totalCampaigns' => $pushModel->countAllResults(),
            'sendingCount'   => $pushModel->where('status', 'sending')->countAllResults(),
        ];
    }

    if ($this->session->can(Permission::USERS_MANAGE)) {
        $usersModel = new UsersModel();
        $data['users'] = [
            'total'         => $usersModel->countAllResults(),
            'newThisMonth'  => $usersModel->where('created_at >=', date('Y-m-01'))->countAllResults(),
        ];
    }

    if ($this->session->can(Permission::COMMENTS_MODERATE)) {
        $data['reviews'] = (new CommentsModel())->getAggregateStats('event');
    }

    return $this->respond($data);
}
```

If `$data` ends up empty (a token that passed `isAuth` but somehow holds none of the checked privileges — shouldn't happen given rule 1, but the endpoint doesn't assume it), just return the empty object; the frontend already won't render anything for it since it gates each widget by permission independently, not by response-key presence.

### BE-4 — Language files

Only reuses the existing `App.accessDenied` key — no new lang strings needed.

---

## Frontend Tasks

### FE-1 — Extract the shared admin-links list

**New file:** `client/utils/adminNav.ts` (or alongside `client/utils/permissions.ts`)

Move `AppHeader`'s `adminLinks` array (href, label key, required permissions) out into an exported constant. `AppHeader` imports it for the dropdown; the new `/admin` page imports the same constant for its SSR guard and its tile grid. No behavior change for the existing dropdown.

### FE-2 — `client/pages/admin/index.tsx`

- SSR (`getServerSideProps`): same auth-guard pattern as `/admin/mailing`, `/admin/users`, etc. — redirect to `/` if no token, or if `hasAnyPermission(user, ADMIN_LINKS.flatMap(l => l.permissions))` is false.
- Renders a tile grid from `ADMIN_LINKS`, filtered the same way `AppHeader` already filters them (`item.permissions.some((p) => userPermissions.includes(p))`) — one `Container`/card per section, icon + title + short description, linking to its existing page.
- Above or beside the tile grid, one small stats widget per section the user can see, each independently gated by `hasPermission()`:
  - **Мероприятия** (`events.statistic`): conducted count, total participants, upcoming count.
  - **Рассылки** (`mailings.manage`): total campaigns, currently sending.
  - **Push-уведомления** (`push.manage`): total campaigns, currently sending.
  - **Пользователи** (`users.manage`): total users, new this month.
  - **Отзывы** (`comments.moderate`): average rating, total reviews.
- New RTK Query endpoint `dashboardGetOverview` (`GET /admin/overview`) in `client/api/api.ts`; add `client/api/types/dashboard.ts` for the response shape. Skip the query entirely (`skip: true`) if the signed-in user holds none of the privileges the endpoint's sections depend on, rather than firing it and rendering nothing.

### FE-3 — Admin dropdown gets an "Обзор" entry

Add `/admin` as the first item in `AppHeader`'s admin dropdown (visible under the same combined condition as the rest of the dropdown, i.e. whenever any admin link is visible), so there's a way back to the overview from any admin subpage.

### FE-4 — i18n

New keys under `pages.admin.index` (RU + EN, both locale files) for tile labels/descriptions and stat labels — no hardcoded strings, per the frontend coding conventions.

### FE-5 — Run after changes

```bash
yarn eslint:fix && yarn prettier:fix && yarn test
```

---

## Acceptance Criteria

- [ ] `/admin` redirects guests and users with none of the admin privileges to `/`
- [ ] The tile grid shows exactly the sections the signed-in user is permitted to open — verified for at least two different privilege combinations (e.g. `events.checkin` only vs. `users.manage` only)
- [ ] Each stats widget is requested and rendered only when the user holds its specific privilege; no 403s occur for widgets a user can't see (because they're never requested)
- [ ] `GET /members` gains `total` without changing its existing paginated `items` shape or breaking `/admin/users`
- [ ] `AppHeader`'s admin dropdown and `/admin`'s tile grid share one source of truth for the link list — no second copy of the permission-to-route mapping
- [ ] README's "User Roles & Permissions" tables are updated if any privilege's usage surface changed (it shouldn't — this feature reuses existing privileges only)
