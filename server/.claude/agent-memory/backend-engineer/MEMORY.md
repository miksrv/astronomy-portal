# Memory Index

- [CI4 BaseModel untyped properties](feedback_ci4_typed_properties.md) — $useTimestamps and other BaseModel props cannot have PHP 8 type hints in child classes; causes fatal error at runtime
- [Error contract migration status](project_error_contract_migration.md) — backend moving fail*() → BaseApiController respond*(); Events.php done; reclassification heuristic for ambiguous old error sites; App.php/General.php off-limits
- [CI4 reserved language file namespaces](feedback_ci4_reserved_lang_namespaces.md) — app/Language files can silently clobber same-named framework language files (e.g. `Files.php`); check vendor first
- [API error contract migration](project_error_contract_migration.md) — in-flight multi-agent move from ResponseTrait fail*() to BaseApiController respond*(); status-code judgment calls and coordination notes
