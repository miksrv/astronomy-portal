# FEAT-17 — Event Waitlist System

**Status:** Planned  
**Priority:** High  
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js)  
**Parallel implementation:** Backend and Frontend can work in parallel once the API contract is agreed.

---

## Overview

When an event is fully booked (`availableTickets === 0`), users currently see a static message "К сожалению, все места закончились" with no action available. Add a waitlist: users can join a queue and get automatically notified by email when a spot opens (i.e., when someone cancels their booking).

This pattern is used by all major event platforms: Kassir.ru, Яндекс.Афиша, Eventbrite.

---

## Business Rules

1. Only authenticated users can join the waitlist.
2. A user can be on the waitlist for only one spot per event.
3. A user who is already registered cannot join the waitlist.
4. When a booking is cancelled, the **first person** in the waitlist (by `created_at ASC`) is notified via email.
5. The notification email contains a **direct link to the event page** — the user must re-register manually within a time window (e.g., 2 hours). The spot is NOT auto-reserved.
6. After notification is sent, the waitlist entry is marked `notified_at = now()` and removed from the active queue — the next person becomes first.
7. The waitlist position is shown to the user ("Вы в очереди, позиция: 3").
8. The user can leave the waitlist at any time.

---

## Database Schema

### Table: `events_waitlist`

```sql
CREATE TABLE events_waitlist (
    id          VARCHAR(15)  NOT NULL,
    event_id    VARCHAR(15)  NOT NULL,
    user_id     VARCHAR(15)  NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified_at DATETIME     NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_user (event_id, user_id),
    KEY idx_event_created (event_id, created_at)
);
```

### Migration

**File:** `server/app/Database/Migrations/{timestamp}_AddEventsWaitlist.php`

---

## Backend Tasks

### BE-1 — `EventsWaitlistModel`

**File:** `server/app/Models/EventsWaitlistModel.php`

Methods:
- `getPosition(string $eventId, string $userId): int` — returns 1-based queue position, 0 if not in queue
- `getFirstInQueue(string $eventId): object|null` — returns the oldest non-notified entry with user email
- `notifyAndRemove(string $entryId): void` — sets `notified_at`, then deletes the row

### BE-2 — New endpoints in `Events` controller

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/events/:id/waitlist` | Join the waitlist |
| `DELETE` | `/events/:id/waitlist` | Leave the waitlist |
| `GET` | `/events/:id/waitlist/position` | Get current user's position |

**POST rules:** auth required, not already registered, not already on waitlist, `availableTickets === 0`.  
**DELETE rules:** auth required, user must be on the waitlist.

### BE-3 — Trigger notification on cancellation

**File:** `server/app/Controllers/Events.php`, `cancel()` method.

After a booking is cancelled and `availableTickets` increases:
```php
$waitlistModel = new EventsWaitlistModel();
$next = $waitlistModel->getFirstInQueue($eventId);
if ($next) {
    // send email to $next->user_email with link to event
    $waitlistModel->notifyAndRemove($next->id);
}
```

### BE-4 — Language files

```php
// ru
'waitlistJoined'     => 'Вы добавлены в лист ожидания.',
'waitlistLeft'       => 'Вы удалены из листа ожидания.',
'waitlistNotify'     => 'Место на астровыезд "{title}" освободилось! Перейдите по ссылке для регистрации: {url}',
'waitlistNotifySubj' => 'Место на астровыезд освободилось',
```

### BE-5 — Surface `waitlistPosition` in `GET /events/upcoming`

Add `waitlistPosition: int` (0 = not in queue) to the upcoming event response when user is authenticated.

---

## Frontend Tasks

### FE-1 — Update `ApiModel.Event` type

Add `waitlistPosition?: number` to the Event model.

### FE-2 — Update `EventUpcoming` component

**When `availableTickets === 0` AND user is authenticated AND not registered:**

Replace the static "нет мест" block with:
```
К сожалению, все места закончились.

[Если вы не в очереди]
  [Кнопка: Встать в лист ожидания]

[Если вы в очереди]
  Вы в листе ожидания. Ваша позиция: {waitlistPosition}
  [Кнопка: Покинуть очередь]
```

### FE-3 — RTK Query endpoints

```typescript
eventsJoinWaitlist: builder.mutation<void, string>({
    invalidatesTags: ['Events'],
    query: (eventId) => ({ method: 'POST', url: `events/${eventId}/waitlist` })
}),
eventsLeaveWaitlist: builder.mutation<void, string>({
    invalidatesTags: ['Events'],
    query: (eventId) => ({ method: 'DELETE', url: `events/${eventId}/waitlist` })
}),
```

---

## Acceptance Criteria

- [ ] Authenticated user can join waitlist when event is full and they are not registered
- [ ] User can see their position in the queue
- [ ] User can leave the waitlist at any time
- [ ] When a booking is cancelled, the first person in the queue receives a notification email
- [ ] The notification email contains a direct link to the event page
- [ ] A user already registered cannot join the waitlist
- [ ] A user cannot join the same event's waitlist twice
- [ ] Waitlist position is shown correctly (1-based)
- [ ] Migration creates the `events_waitlist` table
