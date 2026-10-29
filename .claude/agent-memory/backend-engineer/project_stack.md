---
name: project_stack
description: Non-obvious CI4/model gotchas in the astronomy portal backend that the docs and code don't make obvious
type: project
---

Stack, routes, controllers, models and conventions are documented in `server/CLAUDE.md` — read it first. These are the traps not written there:

- **insertBatch skips callbacks:** `insertBatch()` does not run `beforeInsert` (so no `generateId`) and does not fill `created_at`/`updated_at`. Pre-generate IDs with `uniqid()` and add timestamp columns to the batch array yourself.
- **Entity ID writeback:** `generateId` writes to `$data['data']['id']`, not back to the entity. Set `$entity->id = uniqid()` before `save()` if you need the ID afterwards.
- **EventsModel ID is manual on purpose:** `beforeInsert = []`; the controller sets `$event->id` before save because the upload directory is created from it first. Do not add `generateId` there.
- **Entity datetime wire format:** an attribute in `$dates` becomes a `Time` object (bypassing `$casts`) and serializes as `{date, timezone_type, timezone}` — the frontend's `ApiType.DateTime`. Fields the frontend types as a plain `string` (e.g. `UserEntity::birthday`, `EventMediaEntity::taken_at`) are cast `'?string'` and kept out of `$dates`. Check `client/api/models/*.ts` before adding a datetime field.
- **Adding an index to an existing table:** `$this->forge->addKey('col', false, false, 'idx_name'); $this->forge->processIndexes('table');` in `up()`, `dropKey()` in `down()` (see `AddEventUserPaymentColumns`). Raw generated-column ALTERs are gated behind `DBDriver !== 'MySQLi'` for SQLite tests (see `AddEventUsersActiveBookingUniqueKey`).
- **COUNT on fan-out joins:** `UsersModel::getUsersList()` joins both `events_users` and `push_subscriptions` (both one-to-many) — every aggregate there must be `COUNT(DISTINCT ...)`, or one join inflates the other.
- **Auth guard order:** in every controller method check `isAuth` → `respondUnauthorized()`, then the privilege → `respondForbidden()`, then validate input, then query.
