# Backend tests

```bash
composer test                       # full suite
vendor/bin/phpunit tests/unit/Models  # one directory
vendor/bin/phpunit --filter EventsModelTest
```

- PHPUnit 11.5, configured in `phpunit.xml.dist`; the database is in-memory SQLite, so no MariaDB is needed.
- `tests/unit/{Entities,Filters,Helpers,Libraries,Models}` — unit tests; `tests/feature/` — controller guard tests (auth, payment).
- `tests/database/` — the telescope jobs against real tables (`_support/Database/TelescopeTables` creates them from their migrations); `_support/TelescopeRoutes` registers the `/telescope/*` routes, commented out in `Routes.php` until the feature is presented.
- `ExampleDatabaseTest`, `tests/session/` and `_support/{Database/Migrations,Database/Seeds,Models}` — CodeIgniter starter examples, not project tests.
- Coverage: `vendor/bin/phpunit --coverage-html build/coverage` (needs Xdebug or PCOV).
