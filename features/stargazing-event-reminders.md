# FEAT-18 — Event Reminder Emails (24h Before)

**Status:** Planned  
**Priority:** High  
**Affects:** Backend (CodeIgniter 4) only  
**Parallel implementation:** N/A — backend-only.

---

## Overview

Users register for an event and then may forget about it. A reminder email sent ~24 hours before the event is a standard practice for all event platforms (Eventbrite, Яндекс.Афиша, concert.ru). It reduces no-shows and improves the experience.

The existing mailing/cron infrastructure (`FEAT-1`) provides the scaffolding. A new scheduled command queries upcoming events and sends reminder emails directly (not via the mailing campaign queue).

---

## Business Rules

1. Reminders are sent **once per user per event**, approximately 24 hours before `event.date`.
2. Only users with an active, non-cancelled booking (`events_users.deleted_at IS NULL`) receive reminders.
3. Only users with a non-empty `email` field receive reminders.
4. A reminder is not sent if the user has `subscribe_newsletter = false` in `users.settings` — respect the unsubscribe flag.
5. To avoid duplicates, track sent reminders in a new column `events_users.reminder_sent_at DATETIME NULL`.
6. Reminder emails are sent directly via SMTP (not via the `mailings` queue).
7. The cron command runs every hour and picks up events whose `date` is between `now() + 23h` and `now() + 25h` (2-hour window to tolerate cron drift).

---

## Database Schema

### Migration: add `reminder_sent_at` to `events_users`

**File:** `server/app/Database/Migrations/{timestamp}_AddReminderSentAt.php`

```php
$this->forge->addColumn('events_users', [
    'reminder_sent_at' => [
        'type' => 'DATETIME',
        'null' => true,
        'after' => 'checkin_at',
    ]
]);
```

---

## Backend Tasks

### BE-1 — New CLI command: `SendEventReminders`

**File:** `server/app/Commands/SendEventReminders.php`

```php
class SendEventReminders extends BaseCommand
{
    protected $group   = 'Events';
    protected $name    = 'events:send-reminders';
    protected $description = 'Send 24h reminder emails to registered event attendees';
}
```

**Logic:**
```
1. Find events where date is between (now + 23h) and (now + 25h)
2. For each such event:
   a. Fetch all active bookings (events_users.deleted_at IS NULL, reminder_sent_at IS NULL)
   b. JOIN users to get email, name, locale
   c. Skip users with no email or subscribe_newsletter = false
   d. For each user: send reminder email, set reminder_sent_at = now()
3. Log count of sent reminders
```

### BE-2 — Email content

**Subject (RU):** `Напоминание: астровыезд «{title}» — завтра!`  
**Subject (EN):** `Reminder: star party "{title}" is tomorrow!`

**Body includes:**
- Event title and date/time (UTC+5)
- Guest count from their booking (adults + children)
- Link to QR code: `{siteUrl}/stargazing/entry`
- Location hint (remind them location is in their profile/QR page)
- Link to cancel if they can't attend: `{siteUrl}/stargazing/{eventId}`
- Telegram channel link

### BE-3 — Language files

Add to `server/app/Language/ru/Events.php` and `en/Events.php`:
```php
'reminderSubject' => 'Напоминание: астровыезд «{title}» — завтра!',
'reminderBody'    => '...', // template
```

### BE-4 — Cron registration

Add to hosting cron (or document in README):
```
0 * * * * php /path/to/spark events:send-reminders
```

---

## Acceptance Criteria

- [ ] Migration adds `reminder_sent_at` to `events_users`
- [ ] `events:send-reminders` command exists and runs without errors
- [ ] Command sends emails only to users with active bookings for events happening in 23–25h
- [ ] Each user receives at most one reminder per event (idempotent via `reminder_sent_at`)
- [ ] Users without email or with `subscribe_newsletter = false` are skipped
- [ ] Email contains event title, date/time, guest count, QR link, and cancel link
- [ ] Email is sent in the user's locale
- [ ] Command is safe to run multiple times (no duplicate sends)
