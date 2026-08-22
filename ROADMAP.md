# Project ROADMAP

High-level overview of planned features and improvements for the Astronomy Observatory Portal.

Each feature is described in detail in the `features/` directory.

---

## Planned Features

| ID      | Title                              | Status    | Spec                                                         |
|---------|------------------------------------|-----------|--------------------------------------------------------------|
| FEAT-9  | "What's Visible Tonight" Planner   | Planned   | —                                                            |
| **Core UX** ||||
| FEAT-25 | Admin Dashboard (`/admin`)         | Planned   | [features/admin-dashboard.md](features/admin-dashboard.md)   |
| **Stargazing UX improvements** ||||
| FEAT-26 | Event Gallery Video Uploads (Chunked Media Upload) | In review | [features/stargazing-event-video-uploads.md](features/stargazing-event-video-uploads.md) |
| **Star Atlas / SEO** ||||
| FEAT-27 | Star Atlas Upgrade (`/starmap` Planetarium Mode) | Planned | [features/star-atlas-upgrade.md](features/star-atlas-upgrade.md) |

---

## Notes

- Features are implemented by dedicated frontend and backend agents working in parallel where possible.
- Each feature spec defines the full scope: database schema, API endpoints, UI pages, and acceptance criteria.
- After implementation, completed features are moved to `CHANGELOG.md` under the appropriate version section.
