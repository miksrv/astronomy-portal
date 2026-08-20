---
name: security_audit_2026-08-18
description: PII/access-control audit findings from 2026-08-18 — Comments IDOR fixed same day (commit bc802b9), tracked prod env file still open, verify before reuse
type: project
---

Audit of PII exposure across public/under-protected endpoints, requested 2026-08-18. Two real
findings, everything else in `Events.php`/`Mailings.php`/`Members.php`/`Auth.php` checked out
clean (permission checks correctly gate email/phone/payment fields; `Comments.php`'s
truncateAuthorName() correctly limits public author exposure to "Имя Ф.").

**Finding 1 — `GET /comments?userId=` IDOR (medium/high) — FIXED same day, commit `bc802b9`.**
`Comments::index()` (`server/app/Controllers/Comments.php`) only checked `$this->session->isAuth`
before calling `CommentsModel::getByUser($userId, ...)` — it never checked
`$userId === $this->session->user->id`. Any authenticated user could pass an arbitrary `userId`
and get that user's full review history: review content, star rating, and which events they
attended (join to `events`), i.e. an IDOR leaking behavioral/opinion data (not email/phone
directly, but attendance + private review text). Contrast with `Events::list()`'s `userId`
handling in the same codebase (`server/app/Controllers/Events.php` around line 662), which
explicitly documents *why* it only honours `userId === session user id` and silently ignores any
other value — `Comments::index()` was the one place that pattern wasn't applied. Fixed by adding
`if ($userId !== $this->session->user->id) { return $this->failForbidden(...); }` right after the
auth check — unlike `Events::list()` this branch has no unfiltered fallback to degrade to, so a
mismatched `userId` is rejected outright (403) rather than silently ignored.

**Finding 2 — tracked `server/env` (no dot) deployed to production with `CI_ENVIRONMENT = development`.**
`server/env` is committed to git (not gitignored — only `server/.env` is, per `server/.gitignore:44`)
and `.github/workflows/api-deploy.yml` FTPs it verbatim to the prod server root (`put -O / env`).
As of 2026-08-18 its `CI_ENVIRONMENT` line is set to `development` with the `production` line
commented out (same in the local `.env`, which is NOT deployed). CodeIgniter's `DotEnv` class
(`vendor/codeigniter4/framework/system/Config/DotEnv.php`) defaults to loading a file literally
named `.env` (with dot) — so whether this matters depends on undocumented server-side handling
(does something on the VPS rename `env` → `.env`, or is there already a separately-maintained
`.env` on the box that this upload doesn't touch?). That's outside this repo, so treat as unverified
either way — but the tracked `env` file itself is wrong today regardless: it should never carry
`development` as the active line when it's the artifact the deploy pipeline ships. If it IS what's
live, `Config\Boot\development.php` sets `display_errors=1`, `CI_DEBUG=true` — any uncaught
exception would show a full stack trace including SQL queries (which routinely embed user emails/
phone numbers/payment ids) to anonymous visitors.
**How to apply:** before trusting `ENVIRONMENT` on this project again, ask the user whether the VPS
does a rename step, and check whether `server/env`'s `CI_ENVIRONMENT` line has been fixed to
`production`. Don't assume either way from a stale read of this memory — re-check the file.
Still open as of 2026-08-18 (re-verified): `server/env` line 12 is `CI_ENVIRONMENT = development`,
line 13 has `production` commented out.

**Confirmed clean (as of this audit):**
- `Events::registrations()` (email + payment status) — gated by `EVENTS_STATISTIC` AND `EVENTS_USERS` both.
- `Events::members()` — only name/avatar/auth_type, no email/phone; gated by `EVENTS_USERS`.
- `Events::statistic()` — aggregates only (birthday used only inside `AVG(TIMESTAMPDIFF(...))`, never returned raw); gated by `EVENTS_STATISTIC`.
- `Events::paymentStatus()` — checks `booking->user_id === session user id` before returning anything; no card data ever stored (`PaymentEntity` has no PAN/CVV fields — Alfa-Bank hosted payment page).
- `Mailings::audiences()`/`show()` — counts only, never the raw subscriber email list (`UsersModel::getNewsletterSubscribers()` is only ever aggregated with `count()`).
- `Members::list()` — admin-only (`USERS_MANAGE`), explicitly excludes email/phone in its `select()`.
- `Auth::responseAuth()` — manually strips `auth_type` and `session_token` before returning the user object; the returned profile fields (email/phone/birthday/sex) are the caller's own data.
- `UserEntity`/`UsersModel::$hiddenFields` only hides `deleted_at` (not `session_token`/`birthday`/`sex`) — this is safe today only because every controller that could expose it manually curates its select()/response; a new controller that does `$this->respond($usersModel->find($id))` on someone else's id would leak everything. No such controller exists today, but worth a static check if new admin endpoints are added.
