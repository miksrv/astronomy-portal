---
name: feedback_ci4_forge_rename_table_keeps_index_names
description: CI4's Forge::renameTable() does not rename the table's existing index names, and Forge has no renameIndex() helper — a raw ALTER TABLE ... RENAME INDEX is required
metadata:
  type: feedback
---

MySQL's `RENAME TABLE old TO new` leaves every index defined on that table with its original name (e.g. `idx_old_table_col`) — CodeIgniter 4's `Forge::renameTable()` is a thin wrapper around this and doesn't touch index names either. CI4's `Forge` also has no `renameIndex()`/`modifyKey()` helper. `Forge::modifyColumn($table, ['old_col' => ['name' => 'new_col', 'type' => ..., 'constraint' => ..., 'null' => ...]])` does work for renaming+retyping a column in one `CHANGE` statement, though — confirmed by reading `MySQLi\Forge::_processColumn()`/`_alterTable()`, which builds `CHANGE \`old_col\` \`new_col\` TYPE ...` from the `name`/`new_name` processed-field keys.

**Why:** Discovered implementing FEAT-26's `events_photos` → `events_media` rename migration, which also needed the existing `idx_events_photos_event_taken_at` index renamed to `idx_events_media_event_taken_at` for consistency. `Forge::dropKey()` + `Forge::addKey()` would work too (drop and recreate), but a raw `$this->db->query('ALTER TABLE new_table RENAME INDEX old_idx_name TO new_idx_name')` is the one-statement equivalent and keeps the key's original definition (column order, uniqueness) untouched automatically. `down()` must reverse in the right order: rename the index back while the table still has its post-up name, before renaming the table itself back.

**How to apply:** When a migration renames a table that has named indexes, either explicitly rename those indexes too (raw `RENAME INDEX` query, MySQL 5.7+/MariaDB 10.5+) or intentionally document that they're being left with their old, now-inconsistent name — don't assume the table rename handles it. When a migration also needs to rename+retype a column, use `Forge::modifyColumn()` with a `name` key in the field spec rather than a drop+recreate.
