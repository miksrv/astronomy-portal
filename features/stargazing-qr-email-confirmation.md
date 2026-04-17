# FEAT-15 — Fix QR-code 404 + Booking Email Confirmation

**Status:** Planned  
**Priority:** Critical  
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)  
**Parallel implementation:** QR fix is frontend-only; email confirmation is backend-only. Can be done in parallel.

---

## Overview

Two related critical issues in the registration flow:

1. **QR-code link is broken** — after booking, the "Скачать QR-код для входа на мероприятие" link points to `/stargazing/entry/` which returns 404. The page `client/pages/stargazing/entry.tsx` exists in the codebase but is unreachable — investigate and fix.

2. **No booking confirmation email** — after successful registration the user sees only a green `<Message>` that disappears on page reload. There is no email with event details and QR code. Use the existing mailing infrastructure (`FEAT-1`) to send a transactional confirmation.

---

## Part A — Fix QR-code 404

### Investigation

The file `client/pages/stargazing/entry.tsx` exists. Likely cause: the page requires authentication and silently redirects unauthenticated users, or `getServerSideProps` has a logic bug. Check:
- Does `entry.tsx` do an SSR auth redirect that sends users to `/`?
- Is the route registered correctly in Next.js router?
- The href in `EventUpcoming.tsx` uses `/stargazing/entry/` (trailing slash) — confirm this matches the file path.

### Fix

- Debug and fix whatever causes the 404.
- The entry page should render the user's QR code for the current upcoming event.
- If the page requires auth: redirect to `/auth` (not `/`) and return after login.
- The QR code should encode the user's booking ID or user ID + event ID.

---

## Part B — Booking Confirmation Email

### Business Rules

1. Sent immediately after successful booking (not queued via cron — transactional, single email).
2. Recipient: the registered user's email address.
3. Only sent if the user has an email on record (`users.email IS NOT NULL AND email != ''`).
4. Uses the user's stored `locale` for language selection.
5. Does NOT go through the `mailings` queue — it is a direct SMTP send triggered by the booking API.

### Backend Tasks

#### BE-1 — Add `sendBookingConfirmation()` to Events controller or a dedicated mailer service

Called at the end of `Events::booking()` after the DB insert succeeds.

**Email content (RU/EN):**
- Subject: `Вы зарегистрированы: {event.title}` / `You're registered: {event.title}`
- Body:
  - Event title, date, time (UTC+5)
  - Number of adults + children
  - Link to QR code: `{siteUrl}/stargazing/entry`
  - Reminder: "Покажите QR-код при входе на мероприятие"
  - Link to cancel booking: `{siteUrl}/stargazing/{event.id}`
  - Footer with Telegram channel link

**Implementation:** reuse the existing SMTP configuration from the mailing system (`Config/Email.php` or equivalent). Do not use the `mailings` table — send directly via CodeIgniter's `Email` service.

#### BE-2 — Language files

Add to `server/app/Language/ru/Events.php` and `en/Events.php`:
```php
'bookingConfirmationSubject' => 'Вы зарегистрированы: {title}',
'bookingConfirmationBody'    => '...', // HTML template string or load from view
```

### Frontend Tasks

No frontend changes required for the email itself. The existing success `<Message>` can remain. Optionally add a note: "Подтверждение отправлено на вашу почту."

---

## Acceptance Criteria

- [ ] `/stargazing/entry` loads correctly for authenticated users with an active booking
- [ ] `/stargazing/entry` redirects unauthenticated users to login (not 404)
- [ ] QR code on the entry page encodes a unique, verifiable booking identifier
- [ ] After successful booking, user receives an email with event title, date, time, guest count, and QR link
- [ ] Email is sent in the user's locale (ru/en)
- [ ] If user has no email on record, confirmation is silently skipped (no error)
- [ ] Email is not sent if booking fails
