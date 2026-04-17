# Project ROADMAP

High-level overview of planned features and improvements for the Astronomy Observatory Portal.

Each feature is described in detail in the `features/` directory.

---

## Planned Features

| ID      | Title                              | Status    | Spec                                                         |
|---------|------------------------------------|-----------|--------------------------------------------------------------|
| FEAT-1  | Email Newsletter System            | Completed | [features/email-newsletter.md](features/email-newsletter.md) |
| FEAT-2  | Admin Users List                   | Completed | [features/admin-users-list.md](features/admin-users-list.md) |
| FEAT-4  | Photo Likes / Favourites           | Planned   | —                                                            |
| FEAT-7  | Object Observation History         | Planned   | —                                                            |
| FEAT-8  | Photo Comments                     | Planned   | —                                                            |
| FEAT-9  | "What's Visible Tonight" Planner   | Planned   | —                                                            |
| FEAT-11 | OpenGraph Meta for Photos/Objects  | Planned   | —                                                            |
| FEAT-12 | Object Catalog Filters & Sorting   | Planned   | —                                                            |
| FEAT-13 | Web Push Notifications             | Planned   | —                                                            |
| **Stargazing UX improvements** ||||
| FEAT-15 | Fix QR-code 404 + Email Confirmation After Booking | Planned | [features/stargazing-qr-email-confirmation.md](features/stargazing-qr-email-confirmation.md) |
| FEAT-17 | Event Waitlist System              | Planned   | [features/stargazing-waitlist.md](features/stargazing-waitlist.md) |
| FEAT-18 | Event Reminder Emails (24h Before) | Planned   | [features/stargazing-event-reminders.md](features/stargazing-event-reminders.md) |
| FEAT-19 | i18n Fixes in EventBookingForm     | Planned   | [features/stargazing-i18n-booking-form.md](features/stargazing-i18n-booking-form.md) |
| FEAT-20 | Calendar Invite (.ics) Download    | Planned   | [features/stargazing-calendar-invite.md](features/stargazing-calendar-invite.md) |
| FEAT-22 | Stargazing Index Page Redesign     | Planned   | [features/stargazing-index-redesign.md](features/stargazing-index-redesign.md) |
| **Core UX** ||||
| FEAT-23 | User Personal Cabinet              | Planned   | [features/user-profile.md](features/user-profile.md)         |
| FEAT-24 | Reviews & Comments System          | Partially Complete — "My Reviews" profile section (FE-7) blocked on FEAT-23 | [features/reviews-comments.md](features/reviews-comments.md) |
| FEAT-25 | Admin / Moderator Dashboard        | Planned   | [features/admin-dashboard.md](features/admin-dashboard.md)   |

---

## Notes

- Features are implemented by dedicated frontend and backend agents working in parallel where possible.
- Each feature spec defines the full scope: database schema, API endpoints, UI pages, and acceptance criteria.
- After implementation, completed features are moved to `CHANGELOG.md` under the appropriate version section.
