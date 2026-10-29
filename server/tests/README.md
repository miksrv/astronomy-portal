# Backend tests

```bash
composer test                       # full suite
vendor/bin/phpunit tests/unit/Models  # one directory
vendor/bin/phpunit --filter EventsModelTest
```

- PHPUnit 11.5, configured in `phpunit.xml.dist`; the database is in-memory SQLite, so no MariaDB is needed.
- `tests/unit/{Entities,Helpers,Libraries,Models}` — unit tests; `tests/feature/` — controller guard tests (auth, payment).
- `tests/_support/`, `tests/database/`, `tests/session/` — CodeIgniter starter examples, not project tests.
- Coverage: `vendor/bin/phpunit --coverage-html build/coverage` (needs Xdebug or PCOV).
