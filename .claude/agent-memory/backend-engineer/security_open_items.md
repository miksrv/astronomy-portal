---
name: security_open_items
description: UsersModel hiddenFields only hides deleted_at — new endpoints returning another user's row would leak PII; server/env is only a template (host reads its own .env)
type: project
---

**Caveat — `UsersModel::$hiddenFields` only hides `deleted_at`.** `session_token`, `birthday`, `sex`, email and phone are safe today only because every controller curates its own `select()`/response. A new endpoint doing `$this->respond($usersModel->find($id))` for someone else's id would leak them all.

**Resolved — `server/env`.** It is only a template: the hosting reads its own `.env` (confirmed by the user 2026-10-29), so `CI_ENVIRONMENT = development` in the committed `env` does not reach production. The Comments `userId` IDOR from the 2026-08-18 audit was fixed in `bc802b9`.
