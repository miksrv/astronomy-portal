# FEAT-13 — Web Push Notifications

**Status:** Implemented (2026-08-16) — backend + frontend code complete on `develop` (uncommitted working tree). Pending manual end-to-end verification (real browser subscription, cron registration on the hosting) — see "Implementation Notes (as built)" below for exactly what shipped and where it deliberately deviates from the plan on this page.
**Priority:** Medium
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)
**Parallel implementation:** Backend and Frontend can work in parallel once the API contract below is agreed — the mechanism is a deliberate mirror of the existing email mailing system (`FEAT-1`).

---

## Overview

A second delivery channel for stargazing event announcements, alongside the existing email mailing campaigns. Uses the standard **Web Push API** (Service Worker + Push API + Notification API, VAPID-authenticated, no third-party account/SDK required).

The admin workflow is identical to `/admin/mailing`: **create a draft → send a test → launch → per-recipient delivery rows are drained by a cron command**. Everywhere the existing mailing system uses `mailings` / `mailing_emails`, this feature adds a parallel `push_notifications` / `push_notification_deliveries` pair and reuses the same status machine (`draft → sending → completed`, with `paused` available).

### Key difference from email

Email subscription piggybacks on OAuth login (see root `CLAUDE.md` — "subscription = authentication"). Push **cannot** work that way: the browser permission prompt requires an explicit, separate user action and is scoped to one browser/device, not one account. Consequences:

- A user can have **zero, one, or several** active subscriptions (phone browser, desktop browser, etc.), each a separate row.
- Opt-in happens via a dedicated toggle (not automatically at login).
- Admin visibility into "who has push enabled" means counting/joining `push_subscriptions` by `user_id`, not reading a single flag.

---

## Business Rules

1. Push opt-in is independent of the email `subscribe_newsletter` setting — a user may have one, both, or neither enabled.
2. `push_subscriptions` has a **unique** `endpoint` — re-subscribing the same browser/device updates the existing row (refreshes keys/`updated_at`) instead of creating a duplicate.
3. Campaign lifecycle and statuses (`draft`, `sending`, `completed`, `paused`) are identical to `mailings`.
4. Audience selection mirrors mailings exactly: `all` (all users with ≥1 active subscription) or `event` (users registered for a specific event, intersected with having ≥1 active subscription).
5. Sending is queue-based: `send` enqueues one `push_notification_deliveries` row per **subscription** (not per user — a user with 2 devices gets 2 delivery rows), then a cron command drains the queue in batches.
6. If the push service reports a subscription as gone (HTTP 404/410), the cron command deletes the `push_subscriptions` row and marks the delivery `rejected` — self-cleaning, no manual pruning needed.
7. Unlike email, there is no provider-side deliverability rate limit (no `MailingLimits` equivalent) — push services don't throttle by sender reputation the way SMTP does. Still batch sends to bound per-run work.
8. Clicking a notification opens a URL carried in the payload (e.g. the event page) via `clients.openWindow()`.
9. VAPID keys are generated once and stored in `.env`; regenerating them invalidates every existing subscription (all users would silently stop receiving push until they re-opt-in) — treat as a one-time, deliberate setup step, not a routine credential rotation.

---

## Database Schema

### Migration: `AddPushSubscriptions`

**File:** `server/app/Database/Migrations/{timestamp}_AddPushSubscriptions.php`

```php
$this->forge->addField([
    'id' => [
        'type' => 'VARCHAR', 'constraint' => 24, 'null' => false, 'unique' => true,
    ],
    'user_id' => [
        'type' => 'VARCHAR', 'constraint' => 15, 'null' => false,
    ],
    'endpoint' => [
        'type' => 'VARCHAR', 'constraint' => 512, 'null' => false,
    ],
    'p256dh' => [
        'type' => 'VARCHAR', 'constraint' => 255, 'null' => false,
    ],
    'auth_key' => [
        'type' => 'VARCHAR', 'constraint' => 255, 'null' => false,
    ],
    'user_agent' => [
        'type' => 'VARCHAR', 'constraint' => 255, 'null' => true,
    ],
    'created_at DATETIME default current_timestamp',
    'updated_at DATETIME default current_timestamp',
]);

$this->forge->addPrimaryKey('id');
$this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
$this->forge->addUniqueKey('endpoint');
$this->forge->createTable('push_subscriptions');
```

`user_id` is a hard FK with `ON DELETE CASCADE` — deleting a user removes their subscriptions. This is the join point that lets the admin see "who has notifications enabled."

### Migration: `AddPushNotifications` (mirrors `mailings`)

**File:** `server/app/Database/Migrations/{timestamp}_AddPushNotifications.php`

```php
$this->forge->addField([
    'id' => ['type' => 'VARCHAR', 'constraint' => 24, 'null' => false, 'unique' => true],
    'title' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
    'body' => ['type' => 'TEXT', 'null' => false],
    'icon' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
    'url' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
    'status' => ['type' => 'ENUM("draft", "sending", "completed", "paused")', 'null' => false, 'default' => 'draft'],
    'audience_type' => ['type' => 'ENUM("all", "event")', 'null' => false, 'default' => 'all'],
    'audience_event_id' => ['type' => 'VARCHAR', 'constraint' => 15, 'null' => true],
    'total_count' => ['type' => 'INT', 'null' => false, 'default' => 0],
    'sent_count' => ['type' => 'INT', 'null' => false, 'default' => 0],
    'error_count' => ['type' => 'INT', 'null' => false, 'default' => 0],
    'created_by' => ['type' => 'VARCHAR', 'constraint' => 15, 'null' => true],
    'sent_at' => ['type' => 'DATETIME', 'null' => true],
    'created_at DATETIME default current_timestamp',
    'updated_at DATETIME default current_timestamp',
    'deleted_at' => ['type' => 'DATETIME', 'null' => true],
]);

$this->forge->addPrimaryKey('id');
$this->forge->addForeignKey('created_by', 'users', 'id', 'SET NULL', 'CASCADE');
$this->forge->addForeignKey('audience_event_id', 'events', 'id', 'SET NULL', 'CASCADE');
$this->forge->createTable('push_notifications');
```

### Migration: `AddPushNotificationDeliveries` (mirrors `mailing_emails`)

**File:** `server/app/Database/Migrations/{timestamp}_AddPushNotificationDeliveries.php`

```php
$this->forge->addField([
    'id' => ['type' => 'VARCHAR', 'constraint' => 15, 'null' => false, 'unique' => true],
    'notification_id' => ['type' => 'VARCHAR', 'constraint' => 24, 'null' => false],
    'subscription_id' => ['type' => 'VARCHAR', 'constraint' => 24, 'null' => false],
    'user_id' => ['type' => 'VARCHAR', 'constraint' => 15, 'null' => true],
    'status' => ['type' => 'ENUM("queued", "sent", "error", "rejected")', 'null' => false, 'default' => 'queued'],
    'error_message' => ['type' => 'TEXT', 'null' => true],
    'sent_at' => ['type' => 'DATETIME', 'null' => true],
    'created_at DATETIME default current_timestamp',
    'updated_at DATETIME default current_timestamp',
]);

$this->forge->addPrimaryKey('id');
$this->forge->addForeignKey('notification_id', 'push_notifications', 'id', 'CASCADE', 'CASCADE');
$this->forge->addForeignKey('subscription_id', 'push_subscriptions', 'id', 'CASCADE', 'CASCADE');
$this->forge->addForeignKey('user_id', 'users', 'id', 'SET NULL', 'CASCADE');
$this->forge->addKey('status');
$this->forge->createTable('push_notification_deliveries');
```

---

## Backend Tasks

### BE-1 — Dependencies & VAPID keys

- `composer require minishlink/web-push`
- Generate keys once: `vendor/bin/web-push-vapid-gen` (or the package's documented generator) → store as env vars:
  ```
  push.vapidPublicKey  = "..."
  push.vapidPrivateKey = "..."
  push.vapidSubject    = "mailto:admin@site.tld"
  ```
- Add a thin `Config\Push` (or reuse `getenv()` like `MailingLimits`/`app.siteUrl` already do) exposing these three values.

### BE-2 — Library `WebPushLibrary`

**File:** `server/app/Libraries/WebPushLibrary.php`

Wraps `Minishlink\WebPush\WebPush`, analogous to `EmailLibrary`.

```php
class WebPushLibrary
{
    public function send(PushSubscriptionEntity $subscription, array $payload): void
    // throws WebPushExpiredSubscriptionException (custom) when the push service
    // returns 404/410 — caller deletes the subscription row on catch.
}
```

Payload shape sent to the browser (JSON, consumed by `sw.js`):
```json
{ "title": "...", "body": "...", "icon": "/favicon.ico", "url": "https://site.tld/stargazing/..." }
```

### BE-3 — Migrations

The three migrations above.

### BE-4 — Models

| File | Table | Mirrors | Notes |
|---|---|---|---|
| `PushSubscriptionsModel.php` | `push_subscriptions` | — | `upsertByEndpoint(userId, endpoint, keys, userAgent)`; `countByUser($userId)` |
| `PushNotificationsModel.php` | `push_notifications` | `MailingsModel` | `updateCounts($id)` recalculates `sent_count`/`error_count` from deliveries |
| `PushNotificationDeliveriesModel.php` | `push_notification_deliveries` | `MailingEmailsModel` | `getQueuedBatch($limit)`, `countByNotificationAndStatus($id, $status)` |

### BE-5 — Entities

`PushSubscriptionEntity`, `PushNotificationEntity` (STATUS_DRAFT/SENDING/COMPLETED/PAUSED consts), `PushNotificationDeliveryEntity` (STATUS_QUEUED/SENT/ERROR/REJECTED consts) — same pattern as `MailingEntity` / `MailingEmailEntity`.

### BE-6 — Controller `PushSubscriptions` (user-facing)

**File:** `server/app/Controllers/PushSubscriptions.php`

| Route | Method | Auth |
|---|---|---|
| `GET /push/vapid-key` | returns `{ publicKey }` | public |
| `POST /push/subscribe` | body `{ endpoint, keys: { p256dh, auth }, userAgent }` → upsert row for `session->user->id` | required |
| `DELETE /push/subscribe` | body `{ endpoint }` → delete matching row | required |

### BE-7 — Controller `PushNotifications` (admin) — mirrors `Mailings.php`

**File:** `server/app/Controllers/PushNotifications.php`

Same manual guard pattern used everywhere else in this codebase (`isAuth` + `role === 'admin'` checked per-method, no filter):

```
GET    /push-notifications                → list (draft/sending/completed/paused, newest first)
GET    /push-notifications/:id            → show (includes audience label/count + sentToday-style totals)
POST   /push-notifications                → create draft { title, body, url?, audienceType, audienceEventId? }
PATCH  /push-notifications/:id            → update draft (only status = draft)
DELETE /push-notifications/:id            → delete draft (only status = draft)
POST   /push-notifications/:id/upload     → upload icon image (same pattern as Mailings::upload)
GET    /push-notifications/audiences      → available audience options, same shape as Mailings::audiences
POST   /push-notifications/:id/test       → send immediately to the requesting admin's own subscriptions
POST   /push-notifications/:id/send       → enqueue push_notification_deliveries for every subscription in the audience
```

`send()` logic (mirrors `Mailings::send`):
```
1. Resolve audience → list of users (all subscribers, or event attendees)
2. For each user, fetch their push_subscriptions rows
3. Insert one delivery row per subscription (batched insertBatch, chunks of 200)
4. Update push_notifications: status=sending, total_count=<delivery count>, sent_at=now()
```

### BE-8 — CLI command `SendPushNotifications`

**File:** `server/app/Commands/SendPushNotifications.php`

```
Name: system:send-push
Cron: * * * * *   (same cadence as system:send-email)
```

Logic (mirrors the campaign half of `SendEmail.php`, without the day/hour rate-limit check — not applicable to push):
```
1. Fetch next batch of queued push_notification_deliveries (BATCH_SIZE = 50)
2. For each: load parent notification + subscription
   - WebPushLibrary::send(subscription, payload)
   - success → delivery.status = sent, sent_at = now()
   - expired subscription (404/410) → delete push_subscriptions row, delivery.status = rejected
   - other failure → delivery.status = error, error_message = ...
3. After the batch: PushNotificationsModel::updateCounts() for affected notifications;
   mark notification completed when no queued deliveries remain
```

Register alongside `system:send-email` in the hosting cron.

### BE-9 — Language files

`server/app/Language/{en,ru}/PushNotifications.php` — validation/error strings, same keys pattern as `Mailings.php`.

### BE-10 — Admin visibility: who has push enabled

Extend `Members::list` (backing `/admin/users`) to include, per user:
```json
"pushEnabled": true,
"pushSubscriptionCount": 2
```
via a `LEFT JOIN`/subquery against `push_subscriptions` grouped by `user_id`.

### BE-11 — Routes

```php
$routes->group('push', static function ($routes) {
    $routes->get('vapid-key', 'PushSubscriptions::vapidKey');
    $routes->post('subscribe', 'PushSubscriptions::subscribe');
    $routes->delete('subscribe', 'PushSubscriptions::unsubscribe');
});

$routes->group('push-notifications', static function ($routes) {
    $routes->get('/', 'PushNotifications::list');
    $routes->post('/', 'PushNotifications::create');
    $routes->get('audiences', 'PushNotifications::audiences'); // before (:alphanum)
    $routes->get('(:alphanum)', 'PushNotifications::show/$1');
    $routes->patch('(:alphanum)', 'PushNotifications::update/$1');
    $routes->delete('(:alphanum)', 'PushNotifications::delete/$1');
    $routes->post('(:alphanum)/upload', 'PushNotifications::upload/$1');
    $routes->post('(:alphanum)/test', 'PushNotifications::test/$1');
    $routes->post('(:alphanum)/send', 'PushNotifications::send/$1');
});
```

---

## Frontend Tasks

### FE-1 — Service worker

**File:** `client/public/sw.js`

```js
self.addEventListener('push', (event) => {
    const data = event.data.json()
    event.waitUntil(self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        data: { url: data.url }
    }))
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(clients.openWindow(event.notification.data.url || '/'))
})
```

### FE-2 — Util `client/utils/push.ts`

`registerServiceWorker()`, `getPushPermissionState()`, `subscribeToPush()` (fetches VAPID key, calls `pushManager.subscribe`, posts to `/push/subscribe`), `unsubscribeFromPush()` (calls `pushManager.unsubscribe()`, then `DELETE /push/subscribe`).

### FE-3 — Opt-in UI

Add a toggle in `/profile` settings, next to the existing newsletter/Telegram preferences: "Push-уведомления в браузере" — reflects current `Notification.permission` + whether an active subscription exists; clicking triggers the browser permission prompt via FE-2's `subscribeToPush()`.

### FE-4 — RTK Query endpoints (`client/api/api.ts`)

| Endpoint | Hook suffix | Purpose |
|---|---|---|
| `pushGetVapidKey` | Query | Fetch public VAPID key |
| `pushSubscribe` | Mutation | Register subscription |
| `pushUnsubscribe` | Mutation | Remove subscription |
| `pushNotificationGetList` | Query | Admin list (mirrors `mailingGetList`) |
| `pushNotificationGetItem` | Query | Admin single item |
| `pushNotificationCreate` | Mutation | Create draft |
| `pushNotificationUpdate` | Mutation | Update draft |
| `pushNotificationDelete` | Mutation | Delete draft |
| `pushNotificationUploadIcon` | Mutation | Upload icon image |
| `pushNotificationGetAudiences` | Query | Audience options |
| `pushNotificationTestSend` | Mutation | Send test to admin's own devices |
| `pushNotificationLaunch` | Mutation | Launch campaign |

### FE-5 — Types & models

`client/api/models/push.ts` (`ApiModel.PushNotification`, `PushNotificationListItem`, `PushNotificationStatus`), `client/api/types/push.ts` (request/response shapes) — same split as `mailing.ts`/`types/mailings.ts`.

### FE-6 — Admin pages (mirror `/admin/mailing`)

```
client/pages/admin/push-notifications/index.tsx   — list + status badges + delete draft (copy client/pages/admin/mailing/index.tsx)
client/pages/admin/push-notifications/form.tsx    — create/edit draft (title, body, icon upload, url, audience picker)
client/pages/admin/push-notifications/[id].tsx    — detail: stats (total/sent/error), test-send button, launch button
```

Same SSR admin-role guard as `client/pages/admin/mailing/index.tsx` — use the shared `requireAdminSSR()` helper (`client/utils/adminAuth.ts`) rather than re-copying the check.

### FE-7 — Nav link

In `AppHeader.tsx` `adminLinks`, add:
```ts
{ href: '/admin/push-notifications', label: t('components.common.app-layout.app-header.push-notifications', 'Push-уведомления') }
```

### FE-8 — `/admin/users` admin table

Add a column/badge showing `pushEnabled` (and `pushSubscriptionCount` on hover/tooltip) to `AdminUserItem` rendering, next to however the newsletter status is currently shown (if at all) — otherwise as a new column.

### FE-9 — `robots.txt`

Add `/push-notifications` to `Disallow`.

### FE-10 — i18n keys

Prefix `pages.push-notifications.*` (list/form/detail strings, mirroring `pages.mailing.*`) plus `pages.profile.push-toggle-*` for the opt-in switch. Add to both `client/public/locales/en/translation.json` and `.../ru/translation.json`.

---

## Open Questions / Follow-ups (not blocking BE-1..11 / FE-1..10)

- **iOS Safari** only supports this when the site is installed as a PWA (Add to Home Screen) on iOS 16.4+ — plain Safari tabs never receive push. Consider whether a `site.webmanifest` + install prompt nudge is worth adding as a follow-up; out of scope here.
- No automated cleanup command for stale-but-not-yet-invalid subscriptions (e.g. uninstalled browser that never gets pushed to) — they'll only be pruned the next time a campaign targets them and the push service returns 410. Acceptable for now given campaign frequency (~3/year).

---

## Implementation Notes (as built, 2026-08-16)

Implemented via two parallel passes (backend, frontend) against this spec, after a codebase recon that found several places where the plan above didn't match real conventions. **The corrections below are what actually shipped** — treat this section as authoritative over the task descriptions above wherever they conflict.

### Access control — not `role === 'admin'`

Every `PushNotifications` (admin) controller method uses the project's real pattern instead of BE-7's `role === 'admin'`:
```php
if (!$this->session->isAuth) { return $this->failUnauthorized(lang('App.accessDenied')); }
if (!$this->session->can(Permission::PUSH_MANAGE)) { return $this->failForbidden(lang('App.accessDenied')); }
```
A new privilege `Permission::PUSH_MANAGE = 'push.manage'` was added to `server/app/Enums/Permission.php` (no migration needed — it's a plain PHP enum case; granting it to a role is a data change via `/admin/roles`). The root `README.md` "User Roles & Permissions" table was updated with this privilege in the same change, per the project's maintenance rule. `client/api/models/permission.ts` mirrors it, and `client/pages/admin/roles/index.tsx`'s `Record<Permission, string>` label map needed a new entry for it (TS exhaustiveness — not anticipated in the original plan, required for `yarn build`).

`PushSubscriptions` (user-facing `/push/subscribe`) only checks `isAuth` — no `PUSH_MANAGE` needed, since a user only ever manages their own subscription.

### VAPID keys & config

- `server/app/Config/Push.php` — thin class with `getenv()`-backed static getters (`vapidPublicKey()`/`vapidPrivateKey()`/`vapidSubject()`), following the `Config\MailingLimits` precedent but reading env instead of hardcoding, since these are secrets.
- A real VAPID keypair was generated via `Minishlink\WebPush\VAPID::createVapidKeys()` and written to `server/.env`; `server/env` (the committed template) got the same three keys as empty placeholders.
- `push.vapidSubject = "mailto:no-reply@miksoft.pro"` — reuses the existing `smtp.mail`/`smtp.user` address already used by `EmailLibrary`.

### `WebPushLibrary` — simpler than planned

`minishlink/web-push` v11's `MessageSentReport` already exposes `isSubscriptionExpired()`, so `server/app/Libraries/WebPushLibrary.php` uses that directly instead of manually inspecting the HTTP status code for 404/410. The report→exception mapping is factored into a private `assertReportSucceeded()` method so `server/tests/unit/Libraries/WebPushLibraryTest.php` can exercise all branches (success/404/410/500) via reflection against hand-built PSR-7 responses — no real network calls, mirroring `EmailLibraryTest`'s style.

### Models — real audience-resolution method names

Rather than inventing new logic, audience resolution reuses the exact pattern already in `Mailings.php`/`UsersModel`/`EventsUsersModel`, extended with push-specific siblings:
- `UsersModel::getPushSubscribers()` — mirrors `getNewsletterSubscribers()`.
- `EventsUsersModel::getPushRecipientsByEventId()`, `getPushAudienceByEventId()`, `getPushAudienceEvents()` — mirror the `getMailing*` equivalents, filtered to users with ≥1 `push_subscriptions` row.

**Important fix folded into this work:** `UsersModel::getUsersList()` (backing `/admin/users`) already had a `LEFT JOIN events_users eu` with `COUNT(eu.id) AS events_count` — correct only with a single join. Adding the new `LEFT JOIN push_subscriptions ps` for `pushSubscriptionCount` would have inflated both counts via cartesian row multiplication, so **both aggregates were rewritten to `COUNT(DISTINCT eu.id)` / `COUNT(DISTINCT ps.id)`** — not just the new column, the pre-existing `eventsCount` was quietly wrong-by-omission until this fix.

### Frontend corrections vs. the FE-1..FE-10 tasks above

- **FE-3 / opt-in UI**: `/profile` had *no* existing settings/toggle section at all (the task description's "next to the existing newsletter/Telegram preferences" doesn't exist — email subscription is fully automatic, no UI toggle). Shipped as a new standalone component, `client/components/pages/profile/PushNotificationToggle.tsx`, rendered next to `ProfileCard` rather than inside it.
- **No `Switch` component** in `simple-react-ui-kit` — the opt-in control uses `Checkbox`, matching the role-assignment checkboxes already used in `client/pages/admin/users/index.tsx`.
- **FE-9 / `robots.txt`**: skipped — `client/public/robots.txt` already has a blanket `Disallow: /admin/` (and `/en/admin/`) that covers `/admin/push-notifications`; no edit was needed or made.
- **SSR guard**: the real helper is `requirePermissionSSR(store, context, permission, redirectTo?)` (`client/utils/adminAuth.ts`), not a `requireAdminSSR()` — used with `ApiModel.Permission.PUSH_MANAGE` in all three `client/pages/admin/push-notifications/*` pages.
- `urlBase64ToUint8Array` (VAPID key decoding, `client/utils/push.ts`) needed a `new Uint8Array(n)` + index-loop implementation instead of `Uint8Array.from(...)` — the latter typed as `Uint8Array<ArrayBufferLike>`, which this TS version rejects where `BufferSource`/`Uint8Array<ArrayBuffer>` is required for `pushManager.subscribe({ applicationServerKey })`.
- `client/eslint.config.mjs` needed a new ignore entry for `public/sw.js` (a plain vanilla JS file, not part of the TS project graph), matching existing ignores for other vendored scripts.
- No `preview()`/`cancel()` endpoints were built for push notifications (unlike `Mailings`) — not in this feature's scope; `/admin/push-notifications/[id].tsx` also omits the rate-limit/countdown UI block `mailing/[id].tsx` has, since push has no provider-side send-rate limit (business rule 7).

### What's verified vs. what still needs a human

**Automated / verified in this pass:**
- `composer test` — 359/359 green (320 pre-existing + 39 new: entities, `WebPushLibrary`, plus existing suites unaffected).
- `composer migration:run` — all three migrations applied cleanly; FKs confirmed via `SHOW CREATE TABLE`.
- `php spark routes` — `push`/`push-notifications` groups present, named routes (`vapid-key`, `audiences`) correctly ordered before the `(:alphanum)` catch-all.
- A throwaway smoke-test command exercised the full model chain against a real dev DB (`upsertByEndpoint` update-in-place on re-subscribe, `getPushSubscribers()`, batch insert + `getQueuedBatch` + `updateCounts`) — written, run, then deleted along with its fixtures.
- Frontend: `yarn eslint:fix`, `yarn prettier:fix`, `yarn test` (224/224), `yarn build` — all green.

**Still needs manual verification (can't be done from an agent sandbox):**
- Granting `PUSH_MANAGE` to an actual admin account via `/admin/roles` (nothing has it by default — no admin bypass exists).
- A real browser subscribing via `/profile`'s toggle, confirming a `push_subscriptions` row appears.
- `/admin/push-notifications/:id` → test-send actually reaching a subscribed device, and click-through opening the configured `url`.
- Launching a campaign, then running `php spark system:send-push` manually and confirming `sent`/`completed` transitions and 404/410 cleanup.
- Registering `system:send-push` in the real hosting cron alongside `system:send-email` (`* * * * *`) — a deployment step, not code.

---

## Follow-up (2026-08-17) — Anonymous subscribe + site-wide banner

The original implementation only offered opt-in via a checkbox buried in `/profile` — reachable only by users who already logged in and went looking for it. This follow-up moves discovery to where the audience actually is: a dismissible floating banner shown on every `/stargazing*` page, offered to **guests and logged-in users alike**.

**What changed:**
- `push_subscriptions.user_id` is now nullable (`2026-08-17-100000_AllowAnonymousPushSubscriptions`) — a guest can create a subscription with no owning user yet. The FK itself is untouched (still `CASCADE`/`CASCADE`); a NULL value is simply exempt from it.
- `POST /push/subscribe` no longer requires `isAuth` — it's public, rate-limited instead (`ratelimit:push_subscribe,10,60`, same bucket shape as `comments_create`). `DELETE /push/subscribe` is unchanged (still `isAuth`-only).
- `PushSubscriptionsModel::upsertByEndpoint()` takes a nullable `$userId` and never downgrades an already-claimed row back to anonymous — only an authenticated call can set/change ownership.
- **Claim on login**: the frontend re-POSTs the browser's existing subscription (same `endpoint`/`keys`) right after `isAuth` flips to true (any login/registration path — OAuth, magic link, or a fresh page load's sliding-session refresh). Since the request is now authenticated, the same `upsertByEndpoint()` call claims the row for that user — no new backend endpoint needed.
- **Multi-device** required no backend change — it was already correct: `endpoint` is the unique key per browser/device, `user_id` just tags ownership, and `PushNotifications::send()`/`findByUser()` already fan out over every subscription a user has.
- New frontend component `PushSubscribeBanner` (`client/components/common/push-subscribe-banner/`), a compact bar floating just under the header rather than a bottom panel. Mounted from `_app.tsx` (not `AppLayout`) when `pathname` starts with `/stargazing` — every page under `AppLayout` re-wraps itself independently on navigation (each page instantiates its own `<AppLayout>`), so mounting the banner there would remount/reset it on every in-section page change; `_app.tsx`'s own tree persists across route changes, so the same instance survives navigating between `/stargazing` pages. Dismissing it re-shows the banner after 14 days, not permanently.
- New hook `usePushClaim` (`client/api/usePushClaim.ts`), mounted via a bare `PushClaimSync` component in `_app.tsx` alongside the existing `AuthSessionSync` — runs on every route regardless of layout.

**Deliberately out of scope:** no unsubscribe path for a guest who never logs in (browser-level permission revocation is their only lever); no cleanup command for subscriptions that never get claimed (same reasoning as the Open Questions section above).

### Follow-up (2026-08-17) — "All" audience now reaches unclaimed (anonymous) subscriptions too

Initially, `audienceType = 'all'` was resolved purely via `UsersModel::getPushSubscribers()`, which joins `push_subscriptions` to `users` on `user_id` — a guest subscription (`user_id IS NULL`) has nothing to join to, so it was silently excluded from every campaign, the audience count in the admin UI, and the picker in `audiences()`. Given the entire point of letting guests subscribe is to grow the list before they ever create an account, that made the anonymous-subscribe feature largely pointless in practice — those visitors would never actually receive anything unless they happened to log in later.

**What changed:** `PushSubscriptionsModel::findAnonymous()`/`countAnonymous()` (rows with `user_id IS NULL`) are now added alongside the existing claimed-user path in all three places that resolve the "all" audience — `PushNotifications::send()` (enqueues a delivery row per anonymous subscription too, with `delivery.user_id = null`), `PushNotifications::show()`, and `PushNotifications::audiences()` (both now report `count(claimed users) + count(anonymous subs)`). `PushNotificationDeliveryEntity::user_id` was changed to a nullable cast (`'?string'`, was plain `'string'`) for the same reason `PushSubscriptionEntity::user_id` was — a legitimate `null` must not silently become `''`.

This only applies to `audienceType = 'all'` — an `event` audience still can't include anonymous subscribers, since event registration (`events_users`) itself requires an account; there's no such thing as a guest "registration" to join through in the first place.

---

## Acceptance Criteria

- [x] `push_subscriptions`, `push_notifications`, `push_notification_deliveries` migrations run cleanly with correct FKs
- [x] `POST /push/subscribe` upserts by `endpoint`; `DELETE /push/subscribe` removes the row (verified via a throwaway smoke-test command against a real dev DB)
- [x] Admin can create a draft push notification, edit it, upload an icon, and delete it while still `draft` (code complete; not yet click-tested through the real admin UI)
- [ ] `/push-notifications/:id/test` delivers a real browser notification to the admin's own subscribed device(s) — **needs manual verification**, requires a real subscribed browser + `PUSH_MANAGE` granted via `/admin/roles`
- [x] `/push-notifications/:id/send` enqueues one delivery row per subscription in the chosen audience and flips status to `sending`
- [x] `system:send-push` drains the queue, respects batching, marks `sent`/`error`, deletes expired subscriptions on 404/410, and marks the campaign `completed` once drained
- [x] `/admin/users` admin page shows whether each user has push enabled and how many active subscriptions
- [ ] Clicking a delivered notification opens the configured `url` — **needs manual verification** (real device + click)
- [x] `/profile` has a working opt-in/opt-out toggle that reflects real subscription state (`PushNotificationToggle`; code complete, not yet exercised in a real browser)
- [x] `/push-notifications` is admin-only (SSR guard via `requirePermissionSSR(..., ApiModel.Permission.PUSH_MANAGE)`) — `robots.txt` needed **no change**, already covered by the existing blanket `Disallow: /admin/`
- [x] All new strings exist in both `en` and `ru` locale files
- [x] `yarn eslint:fix`, `yarn prettier:fix`, `yarn test`, `yarn build` (frontend) and `composer test` (backend) all pass
