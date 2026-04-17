# FEAT-20 — Calendar Invite (.ics) Download

**Status:** Planned  
**Priority:** Medium  
**Affects:** Frontend (Next.js) only  
**Parallel implementation:** N/A — frontend-only, no backend needed.

---

## Overview

After registering for an event, users should be able to add it to their calendar with one click. A `.ics` file (iCalendar standard) is supported by Google Calendar, Apple Calendar, Outlook, and all major calendar apps. This is a very high-value, low-effort improvement — generation happens entirely client-side.

---

## Business Rules

1. The "Add to calendar" button is shown only to authenticated users who are registered for the event.
2. The `.ics` file is generated client-side from available event data — no backend endpoint needed.
3. The event in the calendar contains: title, start/end datetime, location hint (or "Оренбургский район"), and a URL to the event page.
4. Exact map coordinates/address are only included in the `.ics` if the user is registered (same logic as location display in `EventUpcoming`).

---

## Frontend Tasks

### FE-1 — Add `generateIcs()` utility

**File:** `client/utils/calendar.ts`

```typescript
export const generateIcs = (event: ApiModel.Event): string => {
    const dtStart = formatDateForIcs(event.date?.date)  // YYYYMMDDTHHMMSSZ
    const dtEnd   = formatDateForIcs(event.endDate?.date ?? event.date?.date, 90) // +90 min fallback
    const uid     = `${event.id}@astro.miksoft.pro`
    const url     = `https://astro.miksoft.pro/stargazing/${event.id}`

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Astronomy Portal//RU',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:Астровыезд: ${event.title}`,
        `DESCRIPTION:${url}`,
        `URL:${url}`,
        'LOCATION:Оренбургский район (~40 км от Оренбурга)',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n')
}

export const downloadIcs = (event: ApiModel.Event): void => {
    const content = generateIcs(event)
    const blob    = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url     = URL.createObjectURL(blob)
    const link    = document.createElement('a')

    link.href     = url
    link.download = `astrovyezd-${event.id}.ics`
    link.click()
    URL.revokeObjectURL(url)
}
```

### FE-2 — Add button to `EventUpcoming`

**File:** `client/components/pages/stargazing/event-upcoming/EventUpcoming.tsx`

Show a calendar button in the `infoSection` group when `registered === true`:

```tsx
{registered && (
    <div className={styles.infoSection}>
        <Icon name={'Calendar'} className={styles.icon} />
        <button
            className={styles.calendarLink}
            onClick={() => downloadIcs(event)}
        >
            {t('components.pages.stargazing.event-upcoming.add-to-calendar', 'Добавить в календарь')}
        </button>
    </div>
)}
```

### FE-3 — Add unit test

**File:** `client/utils/calendar.test.ts`

Test that `generateIcs()` produces a string containing `BEGIN:VCALENDAR`, the event title, and the event URL.

### FE-4 — i18n keys

```json
"add-to-calendar": "Добавить в календарь"
"add-to-calendar": "Add to calendar"
```

---

## Acceptance Criteria

- [ ] "Добавить в календарь" button is visible only to registered users in `EventUpcoming`
- [ ] Clicking the button downloads an `.ics` file
- [ ] The `.ics` file opens correctly in Google Calendar, Apple Calendar, and Outlook
- [ ] File contains: event title, start datetime, URL to event page
- [ ] `generateIcs()` utility has unit tests
- [ ] i18n keys added for both locales
