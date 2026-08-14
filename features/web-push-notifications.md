# FEAT-13 — Web Push Notifications

**Status:** Planned
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

## Acceptance Criteria

- [ ] `push_subscriptions`, `push_notifications`, `push_notification_deliveries` migrations run cleanly with correct FKs
- [ ] `POST /push/subscribe` upserts by `endpoint`; `DELETE /push/subscribe` removes the row
- [ ] Admin can create a draft push notification, edit it, upload an icon, and delete it while still `draft`
- [ ] `/push-notifications/:id/test` delivers a real browser notification to the admin's own subscribed device(s)
- [ ] `/push-notifications/:id/send` enqueues one delivery row per subscription in the chosen audience and flips status to `sending`
- [ ] `system:send-push` drains the queue, respects batching, marks `sent`/`error`, deletes expired subscriptions on 404/410, and marks the campaign `completed` once drained
- [ ] `/admin/users` admin page shows whether each user has push enabled and how many active subscriptions
- [ ] Clicking a delivered notification opens the configured `url`
- [ ] `/profile` has a working opt-in/opt-out toggle that reflects real subscription state
- [ ] `/push-notifications` is admin-only (SSR guard) and added to `robots.txt`
- [ ] All new strings exist in both `en` and `ru` locale files
- [ ] `yarn eslint:fix`, `yarn prettier:fix`, `yarn test`, `yarn build` (frontend) and `composer test` (backend) all pass
