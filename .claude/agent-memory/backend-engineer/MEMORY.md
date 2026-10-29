# Memory Index

- [Project gotchas](project_stack.md) — insertBatch/entity-ID/datetime/index/fan-out-COUNT traps not covered by server/CLAUDE.md
- [Security notes](security_open_items.md) — UsersModel hiddenFields only hides deleted_at; server/env is just a template (host reads .env)
- [CI4 BaseModel untyped properties](feedback_ci4_typed_properties.md) — $useTimestamps and other BaseModel props cannot have PHP 8 type hints in child classes
- [CI4 reserved language file namespaces](feedback_ci4_reserved_lang_namespaces.md) — app/Language files can clobber same-named framework language files (e.g. `Files.php`)
- [CI4 Forge rename-table keeps old index names](feedback_ci4_forge_rename_table_keeps_index_names.md) — no renameIndex(); use a raw ALTER TABLE ... RENAME INDEX
