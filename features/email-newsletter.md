# FEAT-1 — Email Newsletter System

**Status:** Completed  
**Priority:** High  
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)  
**Parallel implementation:** Backend and Frontend tasks can be worked on in parallel once the API contract (endpoints + request/response shapes) is agreed.

---

## Overview

Add an email newsletter/mailing system to the observatory portal. Administrators can compose campaigns (subject, HTML content, optional image attachment), preview them via a test send, then launch a broadcast to all registered users. The system respects hosting SMTP rate limits via a cron-driven queue processor.

---

## Business Rules

1. Only users with role `ADMIN` can access the mailing management UI and API.
2. A campaign has a lifecycle: `draft` → `sending` → `completed` (or `paused` on limit hit).
3. Emails are not sent directly on API call — they are enqueued as individual rows in `mailing_emails` and processed by a cron command.
4. **Rate limits** (hosting constraints):
   - Max **500 emails per hour**
   - Max **2000 emails per day**
   - The cron command must check both counters before each send batch and stop if either limit is reached.
5. Each enqueued email tracks its own status: `queued` → `sent` | `error` | `rejected`.
6. A test send bypasses the queue — it sends immediately to the requesting admin's email.
7. Every email contains an unsubscribe link pointing to the frontend page `/unsubscribe?mail=<mailing_email_id>`. The `mailing_emails.id` (already an opaque `uniqid()` string) is used directly as the identifier — no separate token column is needed.
8. **Unsubscribe mechanism:** clicking the link calls the backend API which finds the `mailing_emails` row by id, retrieves the associated `user_id`, and sets `subscribe_newsletter: false` inside `users.settings` (JSON column). Future campaign launches skip users where this flag is `false`.
9. By default `users.settings` is `NULL`, which means the user **is subscribed**. The flag must be explicitly `false` to exclude someone.
10. The `/unsubscribe` frontend page is publicly accessible — no authentication required.
11. Emails are sent in the user's stored locale (`ru` or `en`).

---

## Database Schema

### Table: `mailings`

Stores mailing campaigns created by admins.

| Column         | Type           | Description                                              |
|----------------|----------------|----------------------------------------------------------|
| `id`           | varchar(24) PK | `uniqid()` — same pattern as other models               |
| `subject`      | varchar(255)   | Email subject line shown to recipients                   |
| `content`      | text           | HTML body content (written by admin, injected into template) |
| `image`        | varchar(500)   | Relative path to attached/embedded image (nullable)      |
| `status`       | enum           | `draft`, `sending`, `completed`, `paused`                |
| `total_count`  | int            | Total recipients enqueued when campaign was launched     |
| `sent_count`   | int            | Emails with status `sent`                                |
| `error_count`  | int            | Emails with status `error`                               |
| `created_by`   | varchar(24) FK | User ID of the admin who created the campaign            |
| `sent_at`      | datetime       | When the campaign was first launched (nullable)          |
| `created_at`   | datetime       | Auto                                                     |
| `updated_at`   | datetime       | Auto                                                     |
| `deleted_at`   | datetime       | Soft delete                                              |

### Table: `mailing_emails`

Individual email queue — one row per recipient per campaign.

| Column         | Type           | Description                                              |
|----------------|----------------|----------------------------------------------------------|
| `id`           | varchar(24) PK | `uniqid()` — also serves as the unsubscribe identifier   |
| `mailing_id`   | varchar(24) FK | References `mailings.id`                                 |
| `user_id`      | varchar(24) FK | References `users.id`                                    |
| `email`        | varchar(255)   | Recipient email address (snapshot at send time)          |
| `locale`       | varchar(5)     | `ru` or `en` — snapshot from `users.locale` at send time |
| `status`       | enum           | `queued`, `sent`, `error`, `rejected`                    |
| `error_message`| text           | SMTP error detail if status = `error` (nullable)         |
| `sent_at`      | datetime       | When the email was successfully sent (nullable)          |
| `created_at`   | datetime       | Auto                                                     |
| `updated_at`   | datetime       | Auto                                                     |

> **No separate unsubscribe token column.** The row `id` is already an opaque `uniqid()` string and is used directly in the unsubscribe URL: `/unsubscribe?mail=<id>`.

### Column added to existing `users` table

A new JSON column stores per-user preferences. Added via a separate migration — **no structural changes** to other columns.

| Column     | Type        | Default | Description                              |
|------------|-------------|---------|------------------------------------------|
| `settings` | json        | NULL    | User preferences as a JSON object        |

Relevant key inside the JSON object:

```json
{ "subscribe_newsletter": false }
```

- `NULL` (column not set) → user **is subscribed** (opt-in by default)
- `{ "subscribe_newsletter": false }` → user has explicitly opted out

### Table: `mailing_unsubscribes`

Audit log — records every unsubscribe action for historical reference. The actual enforcement gate is `users.settings`, not this table.

| Column       | Type         | Description                                            |
|--------------|--------------|--------------------------------------------------------|
| `id`         | varchar(24) PK | `uniqid()` — standard project ID generation          |
| `mailing_email_id` | varchar(24) FK | References `mailing_emails.id` (which campaign triggered the unsubscribe) |
| `user_id`    | varchar(24) FK | References `users.id`                                |
| `email`      | varchar(255) | Email address at time of unsubscribe                   |
| `created_at` | datetime     | When the unsubscribe was recorded                      |

> **ID generation rule:** All three new tables (`mailings`, `mailing_emails`, `mailing_unsubscribes`) use `varchar(24)` primary keys populated by the `generateId` callback in `ApplicationBaseModel` (`uniqid()`). **Do not use `AUTO_INCREMENT`** for any of these tables — this is consistent with every other table in the project.

---

## Backend Tasks

### BE-1 — Add SMTP configuration to `.env`

**File:** `server/.env`

Add the following section (commented in the example `.env.example` as well):

```
#--------------------------------------------------------------------
# SMTP
#--------------------------------------------------------------------

smtp.port = 465
smtp.mail = 'no-reply@miksoft.pro'
smtp.host = 'smtp.jino.ru'
smtp.user = 'no-reply@miksoft.pro'
smtp.pass = 'YOUR_SMTP_PASSWORD'
smtp.senderName = 'Astro Observatory'
```

Also add example lines to `server/env` (the committed example file) with placeholder values.

---

### BE-2 — Add `EmailLibrary`

**File:** `server/app/Libraries/EmailLibrary.php`

Port from `geometki` project with the following adaptations:

- `SENDER_NAME` → read from `getenv('smtp.senderName')` with fallback `'Astro Observatory'`
- Keep both `send()` and `sendWithAttachment()` methods
- Keep the CID placeholder pattern for inline images (`cid:COVER_IMAGE_CID`)
- Keep `$this->email->clear(true)` + `re-initialize` pattern for sequential sends

---

### BE-3 — Create database migrations

**Files:** `server/app/Database/Migrations/`

Create four migration files following the existing naming convention (see `server/app/Database/Migrations/` for examples):

1. `2025-XX-XX-100000_AddMailings.php` — creates `mailings` table
2. `2025-XX-XX-100001_AddMailingEmails.php` — creates `mailing_emails` table
3. `2025-XX-XX-100002_AddMailingUnsubscribes.php` — creates `mailing_unsubscribes` table
4. `2025-XX-XX-100003_AddUserSettings.php` — adds `settings JSON DEFAULT NULL` column to the existing `users` table

**ID generation rule (applies to all three new tables):**
All primary keys are `varchar(24)`, **not** `AUTO_INCREMENT`. In migrations, define the primary key field as:
```php
$this->forge->addField([
    'id' => ['type' => 'VARCHAR', 'constraint' => 24],
    // ...
]);
$this->forge->addPrimaryKey('id');
```
The value is populated at insert time by the `generateId` callback in `ApplicationBaseModel` via `uniqid()`.

**Migration 4 — `AddUserSettings`** uses `modifyTable`:
```php
$this->forge->addColumn('users', [
    'settings' => [
        'type'    => 'JSON',
        'null'    => true,
        'default' => null,
        'after'   => 'locale',
    ],
]);
```

---

### BE-4 — Create Entities

**Files:** `server/app/Entities/`

1. `MailingEntity.php` — maps to `mailings` table, casts all fields, includes `status` constants as class constants:
   ```php
   const STATUS_DRAFT     = 'draft';
   const STATUS_SENDING   = 'sending';
   const STATUS_COMPLETED = 'completed';
   const STATUS_PAUSED    = 'paused';
   ```
2. `MailingEmailEntity.php` — maps to `mailing_emails` table, includes status constants:
   ```php
   const STATUS_QUEUED   = 'queued';
   const STATUS_SENT     = 'sent';
   const STATUS_ERROR    = 'error';
   const STATUS_REJECTED = 'rejected';
   ```

---

### BE-5 — Create Models

**Files:** `server/app/Models/`

1. **`MailingsModel.php`** — extends `ApplicationBaseModel`
   - `$table = 'mailings'`
   - `$returnType = MailingEntity::class`
   - `$useSoftDeletes = true`
   - `$useTimestamps = true`
   - `$beforeInsert = ['generateId']`
   - `allowedFields`: all columns except `id`, `created_at`, `updated_at`, `deleted_at`
   - Method `updateCounts(string $mailingId)` — recalculates `sent_count` and `error_count` from `mailing_emails` table

2. **`MailingEmailsModel.php`** — extends `ApplicationBaseModel`
   - `$table = 'mailing_emails'`
   - `$returnType = MailingEmailEntity::class`
   - `$useSoftDeletes = false` (hard deletes only, or keep all for audit)
   - `$useTimestamps = true`
   - `$beforeInsert = ['generateId']`
   - Method `getQueuedBatch(int $limit = 50): array` — returns next batch of `queued` emails ordered by `created_at ASC`
   - Method `countSentToday(): int` — count `sent` emails in last 24h
   - Method `countSentThisHour(): int` — count `sent` emails in last 1h

3. **`MailingUnsubscribesModel.php`** — extends `ApplicationBaseModel`
   - `$table = 'mailing_unsubscribes'`
   - `$useTimestamps = true` (only `created_at`)
   - `$beforeInsert = ['generateId']`
   - `allowedFields`: `mailing_email_id`, `user_id`, `email`
   - This model is audit-only; enforcement is done via `users.settings`

---

### BE-6 — Create the email HTML template

**File:** `server/app/Views/email_newsletter.php`

Design requirements:
- **Observatory / space theme**: dark header (`#0d1117`) with star motif and the observatory logo text
- Full-width outer wrapper, centered content column max 600px
- Header: observatory name in large white text on dark background, with a subtle star-field gradient
- Content area: white/light background (`#ffffff`), generous padding, readable serif-adjacent body font
- Accent color matches the site's primary blue: `#3b82f6` (used in CTAs and links)
- CTA button: filled `#3b82f6` background, white text, rounded corners, full-width on mobile
- Optional inline image (full-width, max 600px, border-radius)
- Footer: dark strip with observatory coordinates, website URL, and unsubscribe link
- Full email client compatibility: table-based layout, inline CSS, MSO conditionals
- Responsive: single-column on mobile (max-width 600px breakpoint)

**Template variables:**
```php
$subject        // Email subject (used in preheader)
$content        // Main HTML body block provided by admin
$actionText     // CTA button label (optional)
$actionLink     // CTA button URL (optional)
$imageUrl       // Inline image CID or URL (optional)
$unsubscribeUrl // Full frontend unsubscribe URL — always present, e.g. https://astro.miksoft.pro/unsubscribe?mail=<mailing_email_id>
$locale         // 'ru' or 'en' — for footer text (footer copy switches language)
```

**Footer unsubscribe link copy** (locale-aware):
- `ru`: `Вы получили это письмо, так как зарегистрированы на сайте. <a>Отписаться от рассылки</a>`
- `en`: `You received this email because you are registered on our site. <a>Unsubscribe</a>`

---

### BE-7 — Create the `Mailings` API Controller

**File:** `server/app/Controllers/Mailings.php`

All endpoints require `ADMIN` role — check JWT token using the same `Auth` helper pattern as other protected controllers.

#### Endpoints:

**`GET /mailings`** — list all campaigns
- Returns paginated list ordered by `created_at DESC`
- Each item includes: `id`, `subject`, `status`, `total_count`, `sent_count`, `error_count`, `created_at`, `sent_at`

**`POST /mailings`** — create new campaign
- Accepts: `subject`, `content`
- Sets `status = 'draft'`, `created_by = <auth user id>`
- Returns the created campaign object

**`GET /mailings/(:alphanum)`** — get single campaign
- Returns full campaign data + email-level stats breakdown

**`PATCH /mailings/(:alphanum)`** — update campaign
- Only allowed when `status = 'draft'`
- Accepts: `subject`, `content`

**`DELETE /mailings/(:alphanum)`** — delete campaign
- Only allowed when `status = 'draft'` (soft delete)

**`POST /mailings/(:alphanum)/upload`** — upload image attachment
- Accepts multipart file upload
- Stores image in `uploads/mailings/<id>/`
- Updates `mailings.image` with relative path
- Returns `{ image: '/files/mailings/<id>/filename.jpg' }`

**`POST /mailings/(:alphanum)/test`** — send test email
- Sends immediately (bypasses queue) to the requesting admin's email
- Uses the full `email_newsletter.php` template
- Returns `{ success: true }` or error details
- Does NOT change campaign status

**`POST /mailings/(:alphanum)/send`** — launch campaign
- Validates `status = 'draft'`
- Queries `users` table for all users where:
  - `email` is non-null and non-empty
  - `JSON_EXTRACT(settings, '$.subscribe_newsletter') IS NULL OR JSON_EXTRACT(settings, '$.subscribe_newsletter') != false`
  (i.e. skip users who have explicitly set `subscribe_newsletter` to `false`)
- Inserts one row per eligible recipient into `mailing_emails` with `status = 'queued'`; the row `id` (generated by `generateId`) is the unsubscribe identifier
- Updates `mailings.status = 'sending'`, sets `total_count = <enqueued count>`, `sent_at = NOW()`
- Returns `{ queued: <count> }`

**`GET /mailings/unsubscribe`** — process unsubscribe (public endpoint, no auth required)
- Accepts `?mail=<mailing_email_id>` query param
- Finds the `mailing_emails` row by `id`
- If found: updates `users.settings` for the associated `user_id`, setting `subscribe_newsletter = false` (merge into existing JSON object, do not overwrite other settings)
- Inserts an audit row into `mailing_unsubscribes`
- Returns JSON `{ success: true, message: "You have been unsubscribed." }` (consumed by the frontend `/unsubscribe` page)

---

### BE-8 — Add routes

**File:** `server/app/Config/Routes.php`

Add the following group:

```php
/** Mailings Controller **/
$routes->group('mailings', static function ($routes) {
    $routes->get('/', 'Mailings::list');
    $routes->post('/', 'Mailings::create');
    $routes->get('unsubscribe', 'Mailings::unsubscribe');   // public — must be before (:alphanum)
    $routes->get('(:alphanum)', 'Mailings::show/$1');
    $routes->patch('(:alphanum)', 'Mailings::update/$1');
    $routes->delete('(:alphanum)', 'Mailings::delete/$1');
    $routes->post('(:alphanum)/upload', 'Mailings::upload/$1');
    $routes->post('(:alphanum)/test', 'Mailings::test/$1');
    $routes->post('(:alphanum)/send', 'Mailings::send/$1');
    $routes->options('/', static function () {});
    $routes->options('(:any)', static function () {});
});
```

---

### BE-9 — Create the cron `SendEmail` command

**File:** `server/app/Commands/SendEmail.php`

Port from geometki project with adaptations:

```
php spark system:send-email
```

**Logic:**

1. Query `mailing_emails` for up to 50 rows with `status = 'queued'` ordered by `created_at ASC`
2. Check daily limit: count `mailing_emails` where `status = 'sent'` and `sent_at >= NOW() - INTERVAL 1 DAY`. If `>= DAY_EMAIL_LIMIT` (2000), log and exit.
3. Check hourly limit: count `mailing_emails` where `status = 'sent'` and `sent_at >= NOW() - INTERVAL 1 HOUR`. If `>= HOUR_EMAIL_LIMIT` (500), log and exit.
4. For each queued email:
   - Load the parent `mailings` record to get `subject`, `content`, `image`
   - Build unsubscribe URL pointing to the **frontend**: `<NEXT_PUBLIC_SITE_LINK>/unsubscribe?mail=<mailing_email_id>` (the frontend URL env var already exists in the project as `app.baseURL` or `NEXT_PUBLIC_SITE_LINK` — use whichever is available in the PHP config; add `app.siteUrl` to `.env` if not already present)
   - Render template `email_newsletter.php` with all variables
   - Call `EmailLibrary::sendWithAttachment()` with inline image if `mailings.image` is set
   - On success: update row to `status = 'sent'`, `sent_at = NOW()`
   - On exception: update row to `status = 'error'`, store exception message in `error_message`
5. After batch: call `MailingsModel::updateCounts()` for all affected campaign IDs
6. Check if all emails in a campaign are processed (`queued` count = 0) → update `mailings.status = 'completed'`
7. Print summary: Sent / Errors / Remaining

**Cron setup (add to README/docs):**
```
* * * * * cd /path/to/server && php spark system:send-email >> /dev/null 2>&1
```

---

## Frontend Tasks

### FE-1 — Add TypeScript models

**File:** `client/api/models/mailing.ts` _(new file)_

```typescript
export type MailingStatus = 'draft' | 'sending' | 'completed' | 'paused'

export interface Mailing {
    id: string
    subject: string
    content: string
    image?: string
    status: MailingStatus
    totalCount: number
    sentCount: number
    errorCount: number
    createdBy: string
    sentAt?: string
    createdAt: string
    updatedAt: string
}

export interface MailingListItem {
    id: string
    subject: string
    status: MailingStatus
    totalCount: number
    sentCount: number
    errorCount: number
    createdAt: string
    sentAt?: string
}

export interface CreateMailingRequest {
    subject: string
    content: string
}

export interface UpdateMailingRequest {
    subject?: string
    content?: string
}
```

---

### FE-2 — Add RTK Query API endpoints

**File:** `client/api/api.ts`

Add the following endpoints to the existing `api` slice using the existing `baseQuery` and tag pattern:

```
mailingGetList      — GET  /mailings
mailingGetItem      — GET  /mailings/:id
mailingCreate       — POST /mailings          (mutation, invalidates mailingGetList)
mailingUpdate       — PATCH /mailings/:id     (mutation, invalidates mailingGetList + mailingGetItem)
mailingDelete       — DELETE /mailings/:id    (mutation, invalidates mailingGetList)
mailingUploadImage  — POST /mailings/:id/upload  (mutation)
mailingTestSend     — POST /mailings/:id/test    (mutation)
mailingLaunch       — POST /mailings/:id/send    (mutation, invalidates mailingGetList + mailingGetItem)
```

Use the same response/request typing conventions already used throughout `api.ts`.
Tag all GET endpoints with `['Mailings']` tag, and invalidate that tag from mutation endpoints.

---

### FE-3 — Create the Mailings list page

**File:** `client/pages/mailing/index.tsx`

- Protected page: `getServerSideProps` must check auth token and redirect to `/` if role is not `ADMIN` (use the same pattern as `photos/form.tsx` after the SSR auth fix).
- Fetches campaigns via `mailingGetList` hook
- Displays a table/list with columns: **Subject**, **Status** (badge), **Recipients**, **Sent**, **Errors**, **Date**, **Actions**
- Status badges use distinct colors: `draft` → grey, `sending` → blue/animated, `completed` → green, `paused` → orange
- Each row has action buttons: **Edit** (only for drafts), **Launch** (only for drafts), **View stats** (for any)
- "New campaign" CTA button in the top-right, navigates to `/mailing/form`
- Responsive table — on mobile, collapse less important columns

---

### FE-4 — Create the campaign form page

**File:** `client/pages/mailing/form.tsx`

- Protected page (admin only, same SSR auth pattern)
- Used for both **Create** (no `id` query param) and **Edit** (with `?id=<id>`, only drafts)
- Fields:
  - **Email subject** — text input, shown as email subject line
  - **Content** — rich-text or Markdown textarea (use a simple `<textarea>` with HTML support for now; agent may use a simple WYSIWYG if a library is already present, otherwise plain textarea is fine)
  - **Attachment image** — file upload input (accepts `image/*`); shows preview of currently uploaded image; on upload calls `mailingUploadImage` mutation
- **Test send** button — sends to admin's own email immediately, shows a success/error toast
- **Save draft** button — calls `mailingCreate` or `mailingUpdate`
- **Launch** button — shows a confirmation modal with recipient count before calling `mailingLaunch`
- After successful launch, redirect to `/mailing`
- Validation: `subject`, `content` are all required before allowing launch

---

### FE-5 — Campaign stats detail view

**File:** `client/pages/mailing/[id].tsx`

- Protected page (admin only)
- Fetches single campaign via `mailingGetItem`
- Shows:
  - Campaign metadata (subject, status, created/sent dates)
  - Stats summary: total enqueued, sent (green), errors (red), remaining (grey) — displayed as a horizontal progress bar and numeric counters
  - If status is `sending`: auto-refresh stats every 30 seconds (polling with RTK Query `pollingInterval`)
  - Simple breakdown card showing percentages

---

### FE-6 — Add menu link for admins

**File:** `client/components/common/app-header/AppHeader.tsx` _(or wherever the user dropdown menu is rendered)_

- Find the user dropdown/popout menu component
- Add a **"Mailings"** menu item (visible only when `userRole === 'ADMIN'`)
- Link to `/mailing`
- Add the corresponding i18n translation keys (`t('mailings')`) in both `ru` and `en` locale files
- Run `yarn locales:build` after adding keys

---

### FE-7 — Add i18n translation keys

After all UI components are written, add translation keys for all user-facing strings to the source locale files and run `yarn locales:build`.

Keys to add (at minimum):

```json
{
  "mailing": "Рассылки",
  "mailingCreate": "Новая рассылка",
  "mailingSubject": "Тема письма",
  "mailingContent": "Содержимое письма",
  "mailingAttachment": "Прикрепить изображение",
  "mailingTestSend": "Отправить тест",
  "mailingTestSendSuccess": "Тестовое письмо отправлено",
  "mailingSaveDraft": "Сохранить черновик",
  "mailingLaunch": "Запустить рассылку",
  "mailingLaunchConfirm": "Вы уверены? Письма будут отправлены {{count}} участникам.",
  "mailingStatusDraft": "Черновик",
  "mailingStatusSending": "Отправляется",
  "mailingStatusCompleted": "Завершена",
  "mailingStatusPaused": "Приостановлена",
  "mailingStatsSent": "Отправлено",
  "mailingStatsErrors": "Ошибок",
  "mailingStatsTotal": "Всего",
  "mailingNoItems": "Рассылок пока нет",
  "unsubscribeTitle": "Отписка от рассылки",
  "unsubscribeDescription": "Вы больше не будете получать письма с уведомлениями о новых мероприятиях.",
  "unsubscribeSuccess": "Вы успешно отписались от рассылки.",
  "unsubscribeError": "Не удалось выполнить отписку. Возможно, ссылка уже использована или устарела.",
  "goToHomePage": "На главную"
}
```

---

### FE-9 — Create the public `/unsubscribe` page

**File:** `client/pages/unsubscribe.tsx` _(new file)_

This page is **publicly accessible** — no authentication required. It handles the one-click unsubscribe flow from the email footer link.

**Behaviour:**
- Reads `?mail=<mailing_email_id>` from the query string
- If `mail` param is missing → redirect to `/`
- On mount: fires `mailingUnsubscribe` RTK Query endpoint (see FE-2) passing the `mail` param
- While loading: show a centered spinner
- On success: show a success `Message` component with the confirmation text
- On error: show an error `Message` component with the error detail
- After success or error: show a "Go to homepage" `Button` linking to `/`
- Page has `noindex: true`, `nofollow: true` via `NextSeo` so it is not indexed
- Use `getServerSideProps` (with `wrapper.getServerSideProps`) to hydrate auth from cookies and load i18n translations — same minimal pattern used in `entry.tsx`

**Component structure (based on `geometki` reference):**
```tsx
// Centered card layout, uses Container from simple-react-ui-kit
// h1 title: t('unsubscribeTitle')
// p description: t('unsubscribeDescription')
// Spinner while loading
// Message (success or error) once resolved
// Button "Go to homepage" once resolved
```

**RTK Query endpoint to add in FE-2:**
```
mailingUnsubscribe — GET /mailings/unsubscribe?mail=<id>  (no auth, public query)
```
This should be a `query` (not mutation) since it's a GET. Skip if `mail` param is empty.

---

### FE-8 — Update `robots.txt`

**File:** `client/public/robots.txt`

Add the following disallow rules so mailing admin pages are not indexed:

```
Disallow: /mailing
Disallow: /mailing/form
```

> **Note:** `/unsubscribe` does **not** need a `Disallow` rule — it is served with `noindex` via `NextSeo` directly in the page component, which is the correct approach for pages that must be reachable via link but not crawled.

---

## API Contract Summary

| Method   | Endpoint                         | Auth  | Description                      |
|----------|----------------------------------|-------|----------------------------------|
| GET      | `/mailings`                      | ADMIN | List all campaigns               |
| POST     | `/mailings`                      | ADMIN | Create new campaign              |
| GET      | `/mailings/:id`                  | ADMIN | Get campaign with stats          |
| PATCH    | `/mailings/:id`                  | ADMIN | Update draft campaign            |
| DELETE   | `/mailings/:id`                  | ADMIN | Delete draft campaign            |
| POST     | `/mailings/:id/upload`           | ADMIN | Upload image attachment          |
| POST     | `/mailings/:id/test`             | ADMIN | Send test email to admin         |
| POST     | `/mailings/:id/send`             | ADMIN | Launch campaign (enqueue all)    |
| GET      | `/mailings/unsubscribe?mail=:id` | Public| Unsubscribe user by email row id |

---

## Response Shapes

### `GET /mailings` response
```json
{
  "items": [
    {
      "id": "abc123",
      "subject": "Join us for the May observation night!",
      "status": "completed",
      "totalCount": 342,
      "sentCount": 338,
      "errorCount": 4,
      "createdAt": "2025-05-01T10:00:00Z",
      "sentAt": "2025-05-01T12:00:00Z"
    }
  ],
  "count": 1
}
```

### `GET /mailings/:id` response
```json
{
  "id": "abc123",
  "subject": "Join us for the May observation night!",
  "content": "<p>Dear astronomer...</p>",
  "image": "/files/mailings/abc123/poster.jpg",
  "status": "completed",
  "totalCount": 342,
  "sentCount": 338,
  "errorCount": 4,
  "createdAt": "2025-05-01T10:00:00Z",
  "sentAt": "2025-05-01T12:00:00Z"
}
```

---

## Acceptance Criteria

- [ ] Admin can create, edit, and delete draft campaigns
- [ ] Admin can upload an image attachment for a campaign
- [ ] Admin can send a test email to themselves before launching
- [ ] Admin can launch a campaign; all registered users with non-empty emails and `subscribe_newsletter != false` are enqueued
- [ ] Users who have previously unsubscribed (via `users.settings.subscribe_newsletter = false`) are excluded from new campaigns
- [ ] Every sent email contains a working unsubscribe link pointing to `/unsubscribe?mail=<mailing_email_id>`
- [ ] Clicking the unsubscribe link sets `users.settings.subscribe_newsletter = false` for the user and records an audit entry in `mailing_unsubscribes`
- [ ] The `/unsubscribe` frontend page is publicly accessible without authentication, shows correct success/error state, and has `noindex` meta
- [ ] `users.settings` migration adds the JSON column without breaking existing data
- [ ] Cron command respects hourly (500) and daily (2000) email limits
- [ ] Campaign status transitions correctly through `draft` → `sending` → `completed`
- [ ] `sent_count` and `error_count` are updated after each cron batch
- [ ] Email template is responsive, branded, and includes unsubscribe link
- [ ] All admin UI pages are SSR-protected (no flash of content for non-admins)
- [ ] All user-facing strings use the i18n system
- [ ] `robots.txt` excludes all mailing admin routes
- [ ] `yarn eslint:fix`, `yarn prettier:fix`, `yarn test`, `yarn build` all pass after frontend implementation

---

## Implementation Order

### Phase 1 — Backend (can start immediately)
1. BE-1: SMTP config in `.env`
2. BE-2: `EmailLibrary`
3. BE-3: All 4 migrations (run `composer migration:run` after)
4. BE-4 + BE-5: Entities and Models (including updated `UserEntity` with `settings` cast)
5. BE-6: Email HTML template
6. BE-7 + BE-8: Controller + Routes (including public unsubscribe endpoint)
7. BE-9: Cron command

### Phase 2 — Frontend (can start in parallel with Phase 1 backend once API contract is agreed)
1. FE-1: TypeScript models
2. FE-2: RTK Query endpoints (include `mailingUnsubscribe` public query)
3. FE-3: List page
4. FE-4: Form page
5. FE-5: Stats detail page
6. FE-6: Menu link (admin only)
7. FE-9: Public `/unsubscribe` page
8. FE-7: i18n keys + `yarn locales:build`
9. FE-8: `robots.txt`

### Phase 3 — Integration & QA
- Run full test suite: `yarn test`, `composer test`
- Manual test: create draft → test send → launch → verify cron processes queue
- Verify unsubscribe flow end-to-end: click link in email → frontend page → API → `users.settings` updated → audit row in `mailing_unsubscribes`
- Verify excluded users are not enqueued in a subsequent campaign launch
- Verify rate limiting kicks in when limits are reached
