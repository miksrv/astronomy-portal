# User Roles & Permissions

The single source of truth for who can do what. Update it in the same change as any privilege check (see "Maintenance rule" in `CLAUDE.md`).

Access control is privilege-based, not role-based: every backend check tests for one of a fixed set of **privileges** (`App\Enums\Permission`, a PHP backed enum — the single place a new privilege is introduced when new functionality needs one), and a **role** (`user_roles` table) is just a named, admin-editable bundle of privileges. A user can hold several roles at once (`users.roles`, a JSON array of `user_roles.id` values); their effective privileges are the union of every role they're assigned. There is no general admin bypass — the one hardcoded exception is `USERS_MANAGE` itself, see below.

Roles are managed entirely through data, not code — `/admin/roles` lets an admin create a role, name it, and grant it any subset of the fixed privilege list; `/admin/users` assigns roles to a specific user. Adding a new privilege still requires a code change (a new `Permission` case plus the checks that use it); deciding who gets it does not. The one exception is `USERS_MANAGE` (see "The reserved developer role" below), which is deliberately kept out of the "just data" model because it's the privilege that controls every other privilege.

`isAuth` (is there a session at all) is a separate, orthogonal check from privileges — it gates the baseline actions any authenticated account gets (posting a comment, booking an event, editing your own profile, creating/cancelling your own telescope jobs within the limits and listing them with `GET /telescope/jobs?mine=1`, the SIMBAD name lookup `GET /objects/simbad/:name` of the job and object forms — rate-limited), which every account has regardless of which roles, if any, it holds. A user with zero assigned roles is simply a plain authenticated account.

## The privilege catalog

| `Permission::` | Grants |
|---|---|
| `RELAY_CONTROL` | `PUT /relay/set` — observatory power relay control |
| `OBJECTS_MANAGE` | Create/update/delete on the astronomical objects catalog (the SIMBAD lookup `GET /objects/simbad/:name` the object form uses is open to any signed-in user since 4.17.0 — the telescope job form needs it too) |
| `PHOTOS_MANAGE` | Create/update/delete/upload on the astrophoto archive; run a photo's plate solve (`POST /photos/:id/astrometry`) |
| `MAILINGS_MANAGE` | All `/mailings*` endpoints except `unsubscribe` |
| `USERS_MANAGE` | Admin member list (`/admin/users`), viewing another user's event history, and all of `/roles*` (creating/editing roles and assigning them to users). **Reserved** — see "The reserved developer role" below; not a privilege any admin-created role can be granted. |
| `COMMENTS_MODERATE` | Deleting any comment/review (not just your own) |
| `EVENTS_CREATE` | Creating a new stargazing event |
| `EVENTS_UPDATE` | Editing an event and replacing its cover image. Also exempts the viewer from the address/coordinates gating on `GET /events/:id` (see "Event Location & Map" in `server/CLAUDE.md`) so the edit form always shows the real saved values, not just for a viewer with their own booking |
| `EVENTS_DELETE` | Deleting an event. On its own enough for the "Удалить" item of the upcoming event's "⋯" menu on `/stargazing` (the item no longer also needs `EVENTS_UPDATE`/`EVENTS_STATISTIC`) |
| `EVENTS_GALLERY_UPLOAD` | Uploading media — photos **and** videos — to an event's gallery after the fact, across the whole chunked upload flow (`POST /events/media/init/:id`, `POST /events/media/chunk/:sessionId`, `POST /events/media/finalize/:sessionId`, `DELETE /events/media/:sessionId`) |
| `EVENTS_CHECKIN` | QR check-in and viewing any attendee's ticket |
| `EVENTS_STATISTIC` | Event statistics, the registrations table, and re-verifying a registration's payment |
| `EVENTS_REFUND` | Forced refund of a paid registration (stricter than `EVENTS_STATISTIC` — moves real money) |
| `EVENTS_USERS` | `GET /events/members/:id` — viewing the registered-members list for a single event. Distinct from `EVENTS_STATISTIC` (the aggregated registrations/statistics table for an event) and from `USERS_MANAGE` (the site-wide member directory) — a role can be given visibility into one event's attendees without also getting the admin member list or role management. |
| `PIPELINE_MANAGE` | Reserved for the observatory pipeline-management section (in development — no endpoint checks it yet) |
| `PUSH_MANAGE` | All `/push-notifications*` endpoints (admin CRUD push-кампаний, тест-отправка, запуск) — не путать с user-facing `POST /push/subscribe` (public, no `isAuth` needed — a guest may opt in before logging in) / `DELETE /push/subscribe` (requires `isAuth`) |
| `TELESCOPE_MANAGE` | The telescope job queue and the observatory autopilot (FEAT-30), on `/observatory/jobs` and each job's page `/observatory/jobs/:id` (the "⋯" menu; no separate admin page; in 4.17.0 these pages are hidden by `TELESCOPE_JOBS_ENABLED` in `client/utils/constants.ts` and answer 404, the API below is live): every job in any status incl. rejected/cancelled (`GET /telescope/jobs?all=1&status=`), viewing and cancelling anyone's job (`GET`/`DELETE /telescope/jobs/:id`), approving/rejecting (`POST /telescope/jobs/:id/approve|reject`), prioritising/pinning/pausing ("Приостановить" — `held`; only an approved or queued job, never one being shot)/editing (`PATCH /telescope/jobs/:id`), deleting a job still waiting for approval or a final one (`POST /telescope/jobs/:id/remove`; an approved one may already be in the observatory's schedule, it is cancelled first), the agent's full report of tonight's plan (`report` in `GET /telescope/tonight`), no job limits (only the wheel's filters and the altitude floor). Planned for this privilege, not built yet: the patrol list, the observatory settings incl. the autonomous-mode switch, and the full observatory status (power, disk, errors) — today they are changed in the database only. A holder's own new jobs are approved at once (decision #16 in `features/observatory-agent.md`). Creating, viewing and cancelling **one's own** jobs needs only `isAuth`, not this privilege. A patrol night (the agent's own job, `source` = patrol) is changed by nobody, holders of this privilege included: cancel/approve/reject/edit/delete answer 409 to a holder (a patrol night has no author, so anyone else gets 404 on cancel) |

Public without a session: `GET /telescope/jobs` (every job except rejected and cancelled ones; the author's name + avatar, the status reason only for the author and `TELESCOPE_MANAGE`), `GET /telescope/jobs/:id` for such a job, `GET /telescope/tonight` (tonight's plan without scores/reasons/warnings), `GET /telescope/config`.

Owner overrides still apply on top of a privilege check where they always did: `DELETE /telescope/jobs/:id` and `GET` of a rejected/cancelled job (own job, or `TELESCOPE_MANAGE`; anyone else gets 404), `DELETE /comments/:id` (own comment, or `COMMENTS_MODERATE`), `GET /members/:id/events` and `GET /events/ticket/:id` (own data, or `USERS_MANAGE`/`EVENTS_CHECKIN` respectively).

## The reserved developer role

`USERS_MANAGE` is the one privilege that isn't "just data": it grants the ability to create/edit roles and assign them to users (`/roles*`, `Members::updateRoles()`), so a role holding it could otherwise grant itself — or anyone — every other privilege, including itself. To close that escalation path, it's hardcoded rather than left to admin discretion:

- **Only role id 1** (`RolesModel::DEVELOPER_ROLE_ID`, seeded as **"Разработчик"** by `AddRolesTable`) may ever hold `USERS_MANAGE`. `Roles::create()`/`Roles::update()` reject granting it to any other role, and reject removing it from role 1 — the privilege can't be handed out and can't be orphaned.
- Role id 1 can never be **deleted** (`Roles::delete()` rejects it) — there must always be exactly one role capable of managing roles/users.
- Role id 1 can be **assigned to only one user at a time** — `Members::updateRoles()` rejects assigning it to a second user while another already holds it (`UsersModel::isRoleAssignedToOtherUser()`). To hand it off, remove it from the current holder first, then assign it to the new one.
- The admin UI mirrors all three rules (`/admin/roles` hides the `USERS_MANAGE` checkbox for every role except the developer role and won't let it be unchecked there; `/admin/users` disables the developer-role checkbox once someone else already holds it), but the API enforces them independently — the UI restrictions are a convenience, not the security boundary.

## Seeded roles

The migration that introduced this system (`server/app/Database/Migrations/2026-08-13-100001_AddRolesTable.php`) seeded three starter roles, preserving exactly what the old `users.role` ENUM values (`admin`/`moderator`/`security`) could do — any further roles (e.g. a role for event curators with `EVENTS_GALLERY_UPLOAD` + `MAILINGS_MANAGE`, or one for the pipeline team) are created afterwards through `/admin/roles`, not hardcoded:

| Seeded role | Privileges |
|---|---|
| Разработчик (id 1, reserved — see above) | All of the above |
| Команда | `COMMENTS_MODERATE`, `EVENTS_CREATE`, `EVENTS_UPDATE`, `EVENTS_STATISTIC`, `EVENTS_CHECKIN` |
| Охрана | `EVENTS_CHECKIN` |

## Frontend

`GET /auth/me` returns `roles` (role names, display-only — e.g. for the badge list in `/admin/users`) and `permissions` (the flat privilege list, the only thing ever checked). `client/utils/permissions.ts` exports `hasPermission(user, permission)` / `hasAnyPermission(user, permissions)`; every page/component gate and the `requirePermissionSSR()` SSR guard (`client/utils/adminAuth.ts`) go through these instead of comparing a role. `client/api/models/permission.ts` mirrors the backend `Permission` enum — the one remaining place the two ends duplicate each other, down from every call site duplicating a role comparison.
