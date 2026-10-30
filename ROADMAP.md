# Project ROADMAP

Planned features for the Astronomy Observatory Portal. Each one with a spec is detailed in `features/`; once shipped, the spec is deleted and the feature is recorded in `CHANGELOG.md`.

| ID      | Title                              | Status  | Spec                                                       |
|---------|------------------------------------|---------|------------------------------------------------------------|
| FEAT-9  | "What's Visible Tonight" Planner   | Planned | —                                                          |
| FEAT-25 | Admin Dashboard (`/admin`)         | Planned | [features/admin-dashboard.md](features/admin-dashboard.md) |
| FEAT-28 | Star Map Follow-ups (city search, `og:image`, intro copy) | Planned | [features/starmap-followups.md](features/starmap-followups.md) |
| FEAT-29 | Core Web Vitals Follow-ups (i18n split, tree-shakeable UI kit, CSS chunk, `/objects` payload) | Planned | [features/cwv-followups.md](features/cwv-followups.md) |
| —       | Sold-out event waitlist / notify-me (the "Места закончились" panel in `EventUpcoming` has no opt-in; no backend) | Idea | — |
| —       | Live observatory status on the site (read-only, push-only agent on the observatory PC sends an INDI snapshot every 5–10 s: device connection states, mount RA/Dec/Alt/Az + park/tracking/pier side shown as a pointing marker + camera FOV on `<StarMap>`, camera temp/cooler/exposure/filter + last-frame preview, focuser, roof + park reed switches, weather safety, current Ekos Scheduler job; "no link to observatory" when snapshots stop. Same agent is the base for the imaging-requests item below) | Idea | — |
| —       | User imaging requests → KStars/Ekos Scheduler (registered users pick an object from the catalog + filters/frames within limits; admin approval, per-user quotas; an agent on the observatory PC pulls approved jobs via token, generates `.esq`/`.esl`, drives the Ekos Scheduler over DBus, reports status and uploads FITS to the archive; author notified by email. Blocked on reliable roof/limit switches and 12 V power for unattended runs) | Idea | — |
