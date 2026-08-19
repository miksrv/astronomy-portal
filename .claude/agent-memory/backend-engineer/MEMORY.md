# Memory Index

| File | Type | Description |
|------|------|-------------|
| [project_stack.md](project_stack.md) | project | Tech stack, auth pattern, upload paths, locale system, ID strategy, mailing/push notification systems |
| [critical_bugs.md](critical_bugs.md) | project | Critical and high bugs from 2026-03-19 audit — not yet fixed |
| [security_audit_2026-08-18.md](security_audit_2026-08-18.md) | project | PII/access-control audit: Comments IDOR (userId param), tracked prod `server/env` file with CI_ENVIRONMENT=development |
| [security_audit_2026-08-18.md](security_audit_2026-08-18.md) | project | Authz/IDOR audit — Comments::index() userId IDOR (not fixed), Events::registrations() AND-permission bug, rest reviewed clean |
