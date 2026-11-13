# Project ROADMAP

Planned features for the Astronomy Observatory Portal. Each one with a spec is detailed in `features/`; once shipped, the spec is deleted and the feature is recorded in `CHANGELOG.md`.

| ID      | Title                              | Status  | Spec                                                       |
|---------|------------------------------------|---------|------------------------------------------------------------|
| FEAT-9  | "What's Visible Tonight" Planner   | Planned | —                                                          |
| FEAT-25 | Admin Dashboard (`/admin`)         | Planned | [features/admin-dashboard.md](features/admin-dashboard.md) |
| FEAT-30 | Observatory Agent: live status + telescope jobs from the site + supernova patrol autopilot | Phase 1 (status) in 4.16.0, phase 2 (jobs + patrol, human start) in 4.17.0 | [features/observatory-agent.md](features/observatory-agent.md) |
| FEAT-31 | New archive objects in the object form: a drop-down of the names observatory-api has frames for and the portal has no object yet (needs a read-only observatory-api key). The rest of FEAT-31 shipped: objects filled from SIMBAD in 4.16.0, the job target search in 4.17.0 | Planned | — |
| FEAT-32 | Observatory section: summary page split into Equipment (`/observatory/equipment`, public) and Nights (`/observatory/nights`) | Discussion | [features/observatory-pages.md](features/observatory-pages.md) |
| —       | Sold-out event waitlist / notify-me (the "Места закончились" panel in `EventUpcoming` has no opt-in; no backend) | Idea | — |
