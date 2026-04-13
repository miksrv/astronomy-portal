# Backend Security, Quality & Correctness Audit — ROADMAP

**Audit date:** 2026-03-19
**Scope:** Full audit of `server/` — Controllers, Models, Entities, Libraries, Helpers, Filters, Config, Migrations, Tests.
**Stack:** CodeIgniter 4.6 · PHP 8.2 · MySQL · JWT (firebase/php-jwt) · longman/telegram-bot

---

## Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 CRITICAL | Exploitable in production right now; immediate action required |
| 🟠 HIGH | Significant security or correctness risk; fix before next release |
| 🟡 MEDIUM | Degrades reliability or maintainability; fix in current sprint |
| 🔵 LOW | Code quality / polish; fix when convenient |

---

## 2. BUGS — Logic Errors & Incorrect Behavior

### 2.5 `Relay::set()` — missing `return` on validation error paths
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Relay.php:96-108`

```php
if (empty($inputJSON)) {
    $this->failValidationErrors('Invalid request format');  // no return
}
// ...
if (is_null($index) || is_null($state)) {
    $this->fail('Relay set status errors');  // no return
}
```

Both error conditions call `$this->fail*()` without returning, so execution continues past the guard. This means `$this->relayLibrary->setState(null, null)` can be called with null arguments.

---

## 3. PERFORMANCE ISSUES

### 3.1 N+1 query pattern in photo and object listing
**Severity: 🟡 MEDIUM**
**Files:** `app/Models/PhotosModel.php:102-123`

`fetchPhotos()` runs separate `findAll()` calls for:
1. All photos (`$photosQuery->findAll()`)
2. All photo-categories (`$photoCategoryQuery->findAll()`)
3. All photo-objects (`$photoObjectsQuery->findAll()`)
4. All photo-equipments (`$photoEquipmentsModel->where()->findAll()`)

Then it reconstructs relationships in PHP using `array_filter` loops. This is a manual join in application code. For a list of 100 photos this is 4 queries minimum; adding eager loading via SQL JOINs would reduce it to a single query per listing.

Similarly, `ObjectsModel::getObjectsWithCategories()` runs 2 separate queries and reconstructs the relationship in PHP.

---

## 4. CODE QUALITY & ARCHITECTURE ISSUES

### 4.2 Duplicate auth constants defined with `define()` in a controller
**Severity: 🔵 LOW**
**File:** `app/Controllers/Auth.php:20-23`

```php
define('AUTH_TYPE_NATIVE', 'native');
define('AUTH_TYPE_GOOGLE', 'google');
...
```

Constants that represent domain values should not be defined inside a controller file. They should be in `app/Config/Constants.php` or a dedicated `AuthTypes` enum/class so they are accessible throughout the application without loading the controller.

---

### 4.4 Inconsistent ID generation: `uniqid()` is not collision-safe
**Severity: 🟡 MEDIUM**
**Files:** `app/Models/ApplicationBaseModel.php:63`, `app/Controllers/Photos.php:291`, `app/Controllers/Events.php:351`

`uniqid()` generates IDs based on the current time in microseconds. Under concurrent load, two simultaneous requests in the same microsecond can generate identical IDs, causing a primary key collision. PHP's `uniqid()` documentation explicitly warns against using it for unique IDs.

**Fix:** Use `bin2hex(random_bytes(8))` for a cryptographically random, collision-resistant ID, or use UUIDs via `Ramsey\Uuid`.

---

### 4.8 `PhotosModel::$skipValidation = true` — model-level validation is disabled
**Severity: 🟡 MEDIUM**
**File:** `app/Models/PhotosModel.php:58`

`PhotosModel` defines detailed `$validationRules` but then sets `$skipValidation = true`, rendering them useless. The same pattern exists in `EventsModel`, `EventsUsersModel`, `EventsPhotosModel`, and `UsersModel`. Validation rules are defined but never enforced at the model layer.

---

### 4.10 `GoogleClient::_fetchUserInfo()` uses POST instead of GET for userinfo endpoint
**Severity: 🟡 MEDIUM**
**File:** `app/Libraries/GoogleClient.php:105`

```php
$response = $this->client
    ->setHeader('Authorization', 'Bearer ' . $this->access_token)
    ->post('https://www.googleapis.com/oauth2/v3/userinfo');
```

The Google OpenID Connect UserInfo endpoint (`/oauth2/v3/userinfo`) is a GET endpoint. Sending a POST request may fail or return unexpected results depending on Google's API version. The OAuth 2.0 specification defines the UserInfo endpoint as a GET request.

---

## 5. MISSING OR INADEQUATE VALIDATION

### 5.2 `Events::create()` — date fields validated only as `max_length[50]` strings
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Events.php:330-337`

`date`, `registrationStart`, and `registrationEnd` are validated as `string|max_length[50]`, then parsed by `Time::parse()` without a try/catch. A malformed date string will throw an unhandled exception. These fields should be validated with `valid_date` or a regex rule before being passed to `Time::parse()`.

---

### 5.3 `Events::booking()` — no validation that `children` count matches `childrenAges` array length
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Events.php:419-479`

A user can submit `children: 3` but `childrenAges: []`. The booking is stored with an inconsistent state — 3 children but no ages recorded. The `childrenAges` field has no validation rule at all.

---

### 5.4 `Relay::set()` — `state` not validated as binary (0 or 1)
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Relay.php:91-123`

The `state` value from the request is passed directly to `$this->relayLibrary->setState($index, $state)`, which constructs a hardware control URL: `"rb{$relayId}{$action}.cgi"`. There is no validation that `$state` is 0 or 1 and that `$index` is within the valid relay index range (0-7). An admin could pass arbitrary values.

---

### 5.5 Photo upload accepts any file type before MIME check
**Severity: 🟠 HIGH**
**File:** `app/Controllers/Photos.php:174-176`

```php
if (!$fileUpload || !$fileUpload->isValid()) {
    return $this->failValidationErrors('File upload failed or invalid file');
}
```

`isValid()` only checks for PHP upload errors — it does not validate MIME type or file extension. The file is immediately passed to `PhotoUploadLibrary::handleFileUpload()` which calls `getimagesize()` — if the file is not an image this call will fail or return false, but the file will already have been moved to the uploads directory. The file extension is derived from the client-supplied filename, not the actual content.

---

### 5.6 No maximum file size enforcement in application code
**Severity: 🟡 MEDIUM**

`composer.json:37` sets `upload_max_filesize=70M` and `post_max_size=70M` for the dev server. There is no application-level file size check via `$file->getSizeByUnit('mb')` in any upload handler, meaning the only limit is the PHP INI setting which is a hard limit for all files equally, not per-upload-type.

---

## 6. DATABASE / MIGRATION ISSUES

### 6.1 Missing index on `events_users(event_id, user_id)` composite
**Severity: 🟡 MEDIUM**
**File:** `app/Database/Migrations/2024-10-22-111500_AddEventsUsers.php`

`events_users` has foreign keys on `event_id` and `user_id` separately (which MySQL creates indexes for), but there is no composite index on `(event_id, user_id)`. The query `WHERE event_id = ? AND user_id = ?` (used for duplicate booking check) requires a composite index for efficiency. MySQL will only use one index for that WHERE clause without it.

---

### 6.2 Missing index on `objects_fits_files(object, filter)`
**Severity: 🟡 MEDIUM**
**File:** `app/Database/Migrations/2024-10-22-120000_AddObjectsFitsFiles.php`

The `objects_fits_files` table has indexes on `date_obs` and `object` (lines 263-264), but the `System::recalculateFitsFilters()` and `ObjectFitsFilesModel::getObjectStatistic()` operations group by `(object, filter)`. A composite index on `(object, filter)` would significantly speed up these aggregation queries.

---

### 6.3 `objects_fits_files` field `ccd_temp` is TINYINT — limits valid values to -128..127
**Severity: 🔵 LOW**
**File:** `app/Database/Migrations/2024-10-22-120000_AddObjectsFitsFiles.php:139-144`

CCD temperature is stored as a signed TINYINT (range -128 to 127). While most observatory CCDs cool to around -15°C, this is unnecessarily restrictive. A SMALLINT would be more appropriate.

---

### 6.4 `objects_fits_files` field `exptime` is SMALLINT — max 32767 seconds
**Severity: 🟡 MEDIUM**
**File:** `app/Database/Migrations/2024-10-22-120000_AddObjectsFitsFiles.php:87-91`

Exposure time is stored as SMALLINT (max 32,767 seconds = ~9 hours). Deep sky exposures of this length are uncommon but the field will silently truncate values exceeding the limit. INT or MEDIUMINT UNSIGNED would be safer.

---

### 6.5 `events_users` children defaults to 1 — should default to 0
**Severity: 🟡 MEDIUM**
**File:** `app/Database/Migrations/2024-10-22-111500_AddEventsUsers.php:33-38`

```php
'children' => [
    ...
    'default' => 1
],
```

The default value for `children` is 1, but in `Events::booking()` the `children` field is optional (no `required` rule). If a user books without providing a `children` value, the database will default to 1 child even though none were specified. The default should be 0.

---

### 6.6 `objects_categories` has no foreign key from `object_name` to `objects`
**Severity: 🟡 MEDIUM**
**File:** `app/Database/Migrations/2024-10-22-111100_AddObjectsCategories.php`

There is a foreign key from `category_id` to `categories.id`, but `object_name` has no foreign key constraint to `objects.catalog_name`. If an object is deleted, orphaned rows remain in `objects_categories`. The migration adds a non-FK index on `object_name` but not a referential constraint.

---

### 6.7 `events_photos` has `useTimestamps = false` despite having timestamp fields
**Severity: 🔵 LOW**
**File:** `app/Models/EventsPhotosModel.php:31`

The model sets `protected $useTimestamps = false` but the `$createdField` and `$updatedField` are still defined. The migration should clarify whether timestamps are managed manually or automatically.

---

### 6.8 `photos` migration has missing commas in field definitions
**Severity: 🟠 HIGH**
**File:** `app/Database/Migrations/2024-10-22-111100_AddPhotos.php:47,52,57`

```php
'file_size' => [
    ...
    'null'    => false
    'default' => 0         // <-- missing comma after previous line
],
```

Lines 47, 52, and 57 are missing trailing commas in the field definition arrays. This is a PHP syntax error that will cause the migration to fail with a parse error when run.

---

## 7. TEST COVERAGE GAPS

### 7.1 Zero application-specific tests
**Severity: 🟠 HIGH**

The test suite contains only:
- `tests/unit/HealthTest.php` — checks that `APPPATH` is defined and `baseURL` is a valid URL. This tests framework boot, not application logic.
- `tests/database/ExampleDatabaseTest.php` — scaffold placeholder.
- `tests/session/ExampleSessionTest.php` — scaffold placeholder.

There are **no tests** for any controller, model, library, or helper. Specifically missing:

| Component | What should be tested |
|-----------|----------------------|
| `auth_helper.php` | `validateAuthToken()` — expired token, invalid token, missing secret, valid token |
| `locale_helper.php` | `getLocalizedString()` — null inputs, both locales, fallback behavior |
| `filters_helper.php` | `mappingFilters()` — all filter names, unknown filter → 'N' |
| `Auth` controller | OAuth code flow, `me()` with/without valid token |
| `Events` controller | `booking()` registration window, duplicate booking, cancellation, ticket capacity |
| `Objects` controller | CRUD access control, not-found, create with collision |
| `SessionLibrary` | Valid/invalid/expired JWT behavior |
| `PhotoUploadLibrary` | Directory generation, preview creation, file deletion |
| `EventsModel` | `getUpcomingEvent()` — correct timezone math, date boundary |

---

### 7.2 `phpunit.xml.dist` references PHPUnit 9 schema but PHPUnit 11 is installed
**Severity: 🔵 LOW**
**File:** `phpunit.xml.dist:13`

```xml
xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/9.3/phpunit.xsd"
```

`composer.json` requires `phpunit/phpunit: ^11.5` but the XML configuration references the PHPUnit 9 schema. PHPUnit 11 uses a different XML configuration format — several attributes (`convertErrorsToExceptions`, `convertNoticesToExceptions`, `convertWarningsToExceptions`) were removed in PHPUnit 10. The test suite may emit deprecation warnings or fail to run correctly.

---

## Summary Table

| ID | Severity | Category | Short Description |
|----|----------|----------|-------------------|
| 2.5 | 🟡 MEDIUM | Bug | Missing `return` in `Relay::set()` error paths |
| 3.1 | 🟡 MEDIUM | Performance | N+1 style separate queries for photos/objects/filters |
| 4.2 | 🔵 LOW | Quality | Auth type constants defined in controller file |
| 4.4 | 🟡 MEDIUM | Quality | `uniqid()` used as primary key — not collision-safe |
| 4.8 | 🟡 MEDIUM | Quality | `$skipValidation = true` defeats defined model rules |
| 4.10 | 🟡 MEDIUM | Quality | Google userinfo endpoint called with POST instead of GET |
| 5.2 | 🟡 MEDIUM | Validation | Event dates not validated before `Time::parse()` |
| 5.3 | 🟡 MEDIUM | Validation | `childrenAges` count not validated against `children` field |
| 5.4 | 🟡 MEDIUM | Validation | Relay `state` and `index` not range-validated |
| 5.5 | 🟠 HIGH | Validation | Photo upload: MIME type not checked before file move |
| 5.6 | 🟡 MEDIUM | Validation | No per-type file size limits in application code |
| 6.1 | 🟡 MEDIUM | Database | Missing composite index on `events_users(event_id, user_id)` |
| 6.2 | 🟡 MEDIUM | Database | Missing composite index on `objects_fits_files(object, filter)` |
| 6.3 | 🔵 LOW | Database | `ccd_temp` TINYINT is overly restrictive |
| 6.4 | 🟡 MEDIUM | Database | `exptime` SMALLINT can truncate long exposures |
| 6.5 | 🟡 MEDIUM | Database | `events_users.children` defaults to 1 instead of 0 |
| 6.6 | 🟡 MEDIUM | Database | No FK from `objects_categories.object_name` to `objects` |
| 6.7 | 🔵 LOW | Database | `events_photos` has timestamp fields but `useTimestamps = false` |
| 6.8 | 🟠 HIGH | Database | Missing commas in `photos` migration — will fail to parse |
| 7.1 | 🟠 HIGH | Tests | Zero application-specific tests exist |
| 7.2 | 🔵 LOW | Tests | phpunit.xml.dist references PHPUnit 9 schema, not 11 |

---

## Recommended Fix Priority

### Phase 1 — High Impact
1. Fix `photos` migration syntax errors (6.8)
2. Add MIME type validation to photo uploads (5.5)
3. Write application-specific tests (7.1)

### Phase 2 — Medium Priority
4. Fix missing `return` in `Relay::set()` (2.5)
5. Fix `uniqid()` collision risk in ID generation (4.4)
6. Fix `$skipValidation = true` in models (4.8)
7. Add date validation before `Time::parse()` in Events (5.2)
8. Add per-type file size limits (5.6)
9. Add composite DB indexes (6.1, 6.2)
10. Fix `events_users.children` default value (6.5)
11. Add N+1 query optimizations (3.1)

### Phase 3 — Low Priority / Tech Debt
12. Move auth constants out of controller (4.2)
13. Fix Google userinfo POST → GET (4.10)
14. Validate `childrenAges` against `children` (5.3)
15. Validate relay `state`/`index` ranges (5.4)
16. Fix `exptime` SMALLINT limit (6.4)
17. Add FK constraint on `objects_categories.object_name` (6.6)
18. Clarify `events_photos` timestamp handling (6.7)
19. Update phpunit.xml.dist to PHPUnit 11 schema (7.2)
20. Fix `ccd_temp` TINYINT type (6.3)
