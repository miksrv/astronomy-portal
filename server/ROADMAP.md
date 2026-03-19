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

## 1. SECURITY VULNERABILITIES

### 1.1 CORS wildcard allows all origins — no credentials control
**Severity: 🔴 CRITICAL**
**File:** `app/Filters/CorsFilter.php:26`

```php
header("Access-Control-Allow-Origin: *");
```

`Access-Control-Allow-Origin: *` is set unconditionally on every response. Coupled with the fact that mutation endpoints (POST `/objects`, PATCH `/photos`, DELETE) do not require CORS preflight state checks, any arbitrary web origin can make credentialed cross-origin requests when a browser sends a token in the `Authorization` header. The built-in CodeIgniter `Cors` filter (`Config\Cors`) is configured but completely unused (commented out in `Filters.php:34`).

**Fix:** Remove the custom `CorsFilter` and enable the built-in `Cors` filter with an explicit allowlist. Populate `Config\Cors::$default['allowedOrigins']` with only the front-end domains.

---

### 1.2 CSRF protection is globally disabled
**Severity: 🔴 CRITICAL**
**File:** `app/Config/Filters.php:74`

The `csrf` filter alias is defined but never applied — it is commented out of `$globals` and absent from `$methods` and `$filters`. All state-changing requests (create, update, delete, booking, cancel) have no CSRF protection. While JWT in `Authorization` header mitigates classic CSRF for auth'd routes, unauthenticated mutation endpoints and any future cookie-based flows are fully exposed.

**Fix:** Apply the CSRF filter to all non-GET routes, or confirm the API is strictly token-based and document that decision explicitly.

---

### 1.3 Authentication check order — validation runs before auth check
**Severity: 🟠 HIGH**
**Files:** `app/Controllers/Objects.php:104-117`, `app/Controllers/Photos.php:250-270`

In `Objects::create()`, the admin role guard appears at line 106 but then the *exact same check appears again commented out* at line 120-122. The live check is present, but validation (`$this->validate($rules)`) runs before the role check. An unauthenticated caller therefore triggers a database uniqueness check (`is_unique[objects.catalog_name]`) for every request, leaking timing information about catalog_name existence. The correct order is: authenticate → validate.

Additionally in `Author::create()` (line 71) and `Author::update()` (line 105), validation runs *before* the admin check — an unauthenticated user gets full validation feedback instead of a 401/403.

**Fix:** Move all role/auth guards to the very top of each action, before any validation or database work.

---

### 1.4 Authorization returns wrong HTTP status code (403 masquerading as 422)
**Severity: 🟠 HIGH**
**Files:** Multiple controllers — `Objects.php:107`, `Photos.php:252`, `Events.php:296`, `Relay.php:100`, `Author.php:71`, `Author.php:105`, `Author.php:133`

All authorization failures call `$this->failValidationErrors(...)`, which returns HTTP **422 Unprocessable Entity** with an error body. The correct response codes are:
- `failUnauthorized()` → HTTP 401 when the user is not authenticated.
- `failForbidden()` → HTTP 403 when the user is authenticated but lacks permission.

Returning 422 for auth failures breaks standard HTTP semantics and confuses client-side error handling.

---

### 1.5 `system/recalculate/fits` endpoint has no authentication
**Severity: 🔴 CRITICAL**
**File:** `app/Config/Routes.php:10`, `app/Controllers/System.php:29`

`GET /system/recalculate/fits` triggers a full recalculation pass over all FITS files and writes to the `objects_fits_filters` table. There is no authentication, no API key, and no rate limiting. Any anonymous caller can trigger this heavy operation at will, enabling denial-of-service via database load.

**Fix:** Add an API-key header check identical to the pattern in `Files::updates()`, or restrict to admin JWT.

---

### 1.6 File upload — no MIME type validation for event and photo uploads
**Severity: 🟠 HIGH**
**Files:** `app/Controllers/Events.php:362-382`, `app/Controllers/Photos.php:172-213`, `app/Controllers/Events.php:593-610`

Uploaded files are validated only by `isValid()` (no error state) and then moved and processed. File extension is taken from the upload but the **actual MIME type is never checked**. An attacker could upload a PHP file with a `.jpg` extension. CodeIgniter's `UploadedFile::getMimeType()` should be validated against an allowlist before moving the file.

**Fix:** Add MIME type validation: `in_array($file->getMimeType(), ['image/jpeg', 'image/png', 'image/webp'])`.

---

### 1.7 VK OAuth — hardcoded `codeVerifier` / PKCE secret
**Severity: 🟠 HIGH**
**File:** `app/Libraries/VkClient.php:52`

```php
$this->codeVerifier = rtrim(strtr(base64_encode('mySecretCode'), "+/", "-_"), "=");
```

The PKCE code verifier is derived from the static string `'mySecretCode'`. PKCE exists to generate a *per-request, random* secret so that authorization codes cannot be reused by a third party who intercepts the redirect. Using a constant string defeats the entire PKCE mechanism.

**Fix:** Generate `$this->codeVerifier` with `bin2hex(random_bytes(32))` and persist it per-session for the duration of the OAuth flow.

---

### 1.8 Avatar downloaded from external URL without validation
**Severity: 🟠 HIGH**
**File:** `app/Controllers/Auth.php:241`

```php
file_put_contents($avatarDirectory . $avatar, file_get_contents($serviceProfile->avatar));
```

`$serviceProfile->avatar` is a URL returned by a third-party OAuth provider. The URL is used in `file_get_contents()` with no validation. If an attacker can influence the URL (via a crafted OAuth token response for a compromised provider), this is a Server-Side Request Forgery (SSRF) vector. The response content is also never validated as an image before writing.

**Fix:** Validate that the URL is HTTPS and belongs to known provider domains (e.g., `*.googleusercontent.com`). Validate the downloaded content with `getimagesizefromstring()` before writing to disk.

---

### 1.9 Files::updates() processes unvalidated external JSON fields directly
**Severity: 🟠 HIGH**
**File:** `app/Controllers/Files.php:64-128`

The `FILES::updates()` endpoint accepts arbitrary JSON fields (`COMMENT`, `TELESCOP`, `OBSERVER`, `INSTRUME`, etc.) from a FITS metadata sender and stores them in the database with only a simple key guard. Fields like `comment`, `observer`, and `instrume` are stored as-is without length validation or sanitization before insert. While the API key check is present, a compromised automation script could insert arbitrarily long strings into text columns.

---

### 1.10 `die()` used inside a filter to handle OPTIONS preflight
**Severity: 🟡 MEDIUM**
**File:** `app/Filters/CorsFilter.php:32-34`

```php
if ($method === "OPTIONS") {
    die();
}
```

Calling `die()` inside a CodeIgniter filter bypasses the framework's response pipeline — no `after` filters run, no response headers controlled by the framework are added, and the process exits abruptly. The correct approach is to return a `ResponseInterface` with HTTP 204 from the filter's `before()` method.

---

### 1.11 JWT secret key can be empty/false
**Severity: 🟠 HIGH**
**File:** `app/Config/Services.php:36`, `app/Helpers/auth_helper.php:21,48`

`Services::getSecretKey()` returns `getenv('auth.token.secret')`. If the environment variable is not set, `getenv()` returns `false`. The `JWT::decode()` and `JWT::encode()` calls will then receive `false` as the key, which could cause the JWT library to accept any token signed with an empty/false key, or throw an exception that is silently caught and returns null (meaning authentication silently fails open).

**Fix:** Assert that the secret key is a non-empty string and throw a `RuntimeException` at boot time if it is missing.

---

### 1.12 Telegram messages include unsanitized user input
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Events.php:487-493`, `app/Controllers/Events.php:567-576`

The Telegram notification includes `$input['name']` (user-supplied) in an HTML parse-mode message without escaping:

```php
"🔹<i>{$input['name']}</i>\n"
```

If a user supplies a name containing `</i><script>...` or HTML entities that confuse Telegram's HTML parser, the message can be malformed or trigger unexpected rendering.

**Fix:** Escape the user's name with `htmlspecialchars()` before interpolating into the Telegram HTML message.

---

## 2. BUGS — Logic Errors & Incorrect Behavior

### 2.1 `getLocalizedString()` uses `||` instead of `??` — always returns bool
**Severity: 🔴 CRITICAL**
**File:** `app/Helpers/locale_helper.php:15-16`

```php
return $locale === 'ru'
    ? (!empty($titleRu) ? $titleRu : $titleEn || '')
    : (!empty($titleEn) ? $titleEn : $titleRu || '');
```

The fallback `$titleEn || ''` uses the boolean OR operator, not the null-coalescing operator `??`. When `$titleEn` is `null` or an empty string, the expression evaluates to the boolean `false`, not an empty string. This means all localized titles/descriptions can silently become `false` (which JSON-encodes as `false`), corrupting API responses for every object, category, and event.

**Fix:** Replace `$titleEn || ''` with `$titleEn ?? ''` and `$titleRu || ''` with `$titleRu ?? ''`.

---

### 2.2 `Photos::list()` returns `$photosData` instead of `$result`
**Severity: 🟠 HIGH**
**File:** `app/Controllers/Photos.php:61-67`

```php
$result = preparePhotoDataWithFilters($photosData, $filtersData);

return $this->respond([
    'count' => count($photosData),
    'items' => $photosData   // <-- should be $result
]);
```

`preparePhotoDataWithFilters()` processes `$photosData` to attach filter statistics to each photo item, returning the enriched array as `$result`. However, the response sends the *original* `$photosData` without the filter statistics. The `$result` variable is discarded entirely.

**Fix:** Change `'items' => $photosData` to `'items' => $result`.

---

### 2.3 `Events::booking()` — missing `return` on event-not-found guard
**Severity: 🟠 HIGH**
**File:** `app/Controllers/Events.php:436-438`

```php
if (!$event) {
    $this->failValidationErrors(['error' => 'Такого мероприятия не существует']);
}
```

The result of `$this->failValidationErrors()` is not returned. Execution continues past the guard even when the event does not exist, leading to a null pointer access on `$event->registration_start` at line 450.

The same bug exists in `Events::cancel()` at line 537-539.

**Fix:** Add `return` before both `$this->failValidationErrors(...)` calls.

---

### 2.4 `Events::upcoming()` accesses `$eventData->registered` before it is set
**Severity: 🟠 HIGH**
**File:** `app/Controllers/Events.php:94`

```php
if (!$eventData->registered) {
    unset($eventData->yandexMap, $eventData->googleMap);
}
```

The property `registered` is only set on the object inside the `if ($bookedEvents)` block (line 77). When `$bookedEvents` is false (unauthenticated or not registered), `$eventData->registered` is undefined. Accessing an undefined dynamic property on a `stdClass`-derived object returns null in PHP 8.2 and triggers a deprecation notice; a strict type check or typed entity would throw.

**Fix:** Initialize `$eventData->registered = false;` before the `if ($bookedEvents)` block.

---

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

### 2.6 `Events::create()` — unreachable `return $this->respond()` after try/catch
**Severity: 🔵 LOW**
**File:** `app/Controllers/Events.php:403-405`

```php
    } catch (\Exception $e) { ... }

    return $this->respond();  // unreachable — every path inside try returns
}
```

The final `return $this->respond()` at line 404 is unreachable. Both the happy path and the exception path return inside the try/catch block. This is dead code and suggests the control flow was not fully thought through.

---

### 2.7 `EventsModel::getUpcomingEvent()` — wrong datetime format string (`H:m:s`)
**Severity: 🟠 HIGH**
**File:** `app/Models/EventsModel.php:77`

```php
->where('date >=', $datetime->format('Y-m-d H:m:s'))
```

The format string `H:m:s` uses `m` (month) where it should be `i` (minutes). The resulting datetime string will have the month number in the minutes position, e.g., `2026-03-19 14:03:22` instead of `2026-03-19 14:37:22`. This means upcoming event queries are filtered against an incorrect datetime, causing events to appear or disappear from the "upcoming" feed at wrong times.

**Fix:** Change `'Y-m-d H:m:s'` to `'Y-m-d H:i:s'`.

---

### 2.8 `Objects::update()` — categories are saved even when object does not exist
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Objects.php:180-196`

The code saves categories (delete + re-insert loop, lines 182-190) *before* checking whether the object itself exists (line 192). If the object is not found, the category records are written to an orphaned state and then the 404 is returned — leaving stale data in `objects_categories`.

**Fix:** Check that the object exists before any write operations.

---

### 2.9 `UsersModel::updateUserActivity()` — unnecessary extra SELECT before UPDATE
**Severity: 🟡 MEDIUM**
**File:** `app/Models/UsersModel.php:78-84`

```php
$userData = $this->select('updated_at')->find($userId);
$user = new UserEntity();
$user->updated_at  = $userData->updated_at;
$user->activity_at = Time::now();
$this->update($userId, $user);
```

The model fetches `updated_at` only to pass it back into the update call, but `useTimestamps = true` already manages `updated_at` automatically. The select is wasted and the passed-in `updated_at` will be overwritten by the timestamp handler anyway. This adds an extra query to *every single authenticated request*.

---

### 2.10 `System::recalculateFitsFilters()` — `$objectHaveUpdates` set but never used
**Severity: 🔵 LOW**
**File:** `app/Controllers/System.php:82`

```php
$objectHaveUpdates = true;
```

The variable is assigned inside the loop but never read. This is dead code from an incomplete feature.

---

### 2.11 `Files::updates()` — undefined classes `ObjectModel` and `ObjectFitsFileModel`
**Severity: 🔴 CRITICAL**
**File:** `app/Controllers/Files.php:75-76`

```php
$objectsModel = new ObjectModel();
$modelFiles   = new ObjectFitsFileModel();
```

The controller imports `App\Models\ObjectModel` and references `ObjectFitsFileModel`, but neither of these class names exists in the codebase. The correct class names are `ObjectsModel` and `ObjectFitsFilesModel` (both plural). This means the `Files::updates()` endpoint — the FITS data ingestion endpoint — throws a fatal `Class not found` error on every call.

---

### 2.12 `Photos::download()` — null pointer dereference before existence check
**Severity: 🟠 HIGH**
**File:** `app/Controllers/Photos.php:127-133`

```php
$photoLink = UPLOAD_PHOTOS . $photoData->image_name . '.' . $photoData->image_ext;

if ($photoData && file_exists($photoLink)) {
```

`$photoLink` is constructed from `$photoData->image_name` before the null guard `if ($photoData && ...)`. If `$photoData` is null (record not found), this throws a fatal error. The null check must come first.

---

### 2.13 `EventsUsersModel::getUsersCountByEventId()` — `children` field uses JSON_LENGTH instead of SUM
**Severity: 🟡 MEDIUM**
**File:** `app/Models/EventsUsersModel.php:69-70`

```php
SUM(JSON_LENGTH(events_users.children)) as total_children
```

The `children` column in the migration is a `TINYINT`, not a JSON array. Calling `JSON_LENGTH()` on an integer column will return null for every row. The correct aggregate is `SUM(events_users.children)`. The same incorrect query exists in `getUsersCountGroupedByEventId()` (line 86).

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

### 3.2 `Objects::list()` fetches ALL filter records unconditionally
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Objects.php:48`

```php
$filtersData = $filtersModel->findAll();
```

Every call to `GET /objects` loads the entire `objects_fits_filters` table into PHP memory. As the table grows (one row per object per filter type, 8 possible filters), this becomes increasingly wasteful. The `prepareObjectDataWithFilters()` helper already does a group-by in PHP — performing the GROUP BY in SQL and fetching only the filters for visible objects would be more efficient.

---

### 3.3 `Statistic::telescope()` loads all FITS records into PHP memory
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Statistic.php:94-97`

```php
$filesData = $filesModel
    ->select('date_obs, exptime, object')
    ->where($where)
    ->findAll();
```

The entire (potentially tens of thousands of rows) FITS files table is loaded into PHP and aggregated manually using nested array operations. This should be a GROUP BY query in SQL.

---

### 3.4 `Author::list()` performs O(n×m) array search in PHP
**Severity: 🔵 LOW**
**File:** `app/Controllers/Author.php:43`

```php
$key = array_search($photo->author_id, array_column($dataAuthors, 'id'));
```

For every photo, `array_column` re-extracts the author IDs from all authors — this is O(n×m) complexity. A single SQL GROUP BY or a keyed lookup array built once would be O(n).

---

### 3.5 `SessionLibrary` triggers a DB write on every authenticated request
**Severity: 🟡 MEDIUM**
**File:** `app/Libraries/SessionLibrary.php:25-29`

Every constructor call for `SessionLibrary` calls `validateAuthToken()`, which itself queries the database via `UsersModel::findUserByEmailAddress()`. Many controllers (`Objects`, `Photos`, `Events`, `Relay`, `Categories`) instantiate `SessionLibrary` in their constructor, meaning every API request hits the database at least once just for token validation. A short-lived in-memory cache (or Redis) for JWT claims would eliminate this per-request database hit.

Additionally `Auth::me()` calls `$this->session->update()` which triggers `UsersModel::updateUserActivity()` — adding a second DB round-trip on every heartbeat call.

---

### 3.6 No caching on frequently read, rarely changing data
**Severity: 🔵 LOW**

The categories list (`GET /categories`), equipment list (`GET /equipments`), and objects list (`GET /objects`) are read on every page load and change infrequently. None of them use CodeIgniter's cache layer. Adding response-level caching (e.g., 5 minutes) would significantly reduce database load for the most trafficked endpoints.

---

## 4. CODE QUALITY & ARCHITECTURE ISSUES

### 4.1 Hardcoded Russian error strings mixed with language files
**Severity: 🟡 MEDIUM**
**Files:** `Objects.php:107,145,197,200`, `Photos.php:252`, `Events.php:126,131,...`, `Relay.php:100`, `Author.php:71`

Multiple controllers contain hardcoded Russian strings for error messages (e.g., `'Ошибка прав доступа'`, `'Объект не найден'`) while the project has a language file system (`app/Language/en/`, `app/Language/ru/`). These strings are untranslatable and inconsistent.

---

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

### 4.3 `UserEntity` has duplicate keys in `$attributes`
**Severity: 🔵 LOW**
**File:** `app/Entities/UserEntity.php:17-19`

```php
'locale'  => 'ru',
'locale'  => 'ru',   // duplicate key
'avatar'  => null,   // duplicate key (already defined on line 14)
```

PHP silently ignores duplicate array keys, taking the last value. This is a code defect that will cause confusion and may hide intentional attribute removals.

---

### 4.4 Inconsistent ID generation: `uniqid()` is not collision-safe
**Severity: 🟡 MEDIUM**
**Files:** `app/Models/ApplicationBaseModel.php:63`, `app/Controllers/Photos.php:291`, `app/Controllers/Events.php:351`

`uniqid()` generates IDs based on the current time in microseconds. Under concurrent load, two simultaneous requests in the same microsecond can generate identical IDs, causing a primary key collision. PHP's `uniqid()` documentation explicitly warns against using it for unique IDs.

**Fix:** Use `bin2hex(random_bytes(8))` for a cryptographically random, collision-resistant ID, or use UUIDs via `Ramsey\Uuid`.

---

### 4.5 `Photos::save()` — both create and update return `respondCreated` (HTTP 201)
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Photos.php:358`

The `save()` method is called by both `create()` and `update()`. The final response always calls `$this->respondCreated()` (HTTP 201), even during an update. Updates should return HTTP 200 via `$this->respondUpdated()`.

---

### 4.6 `Events::upload()` responds `respondCreated` but the photo entity has no ID
**Severity: 🔵 LOW**
**File:** `app/Controllers/Photos.php:208`

After a successful photo file upload, `respondCreated($photo)` returns the `PhotoEntity` object. However, this entity was created with `new \App\Entities\PhotoEntity()` and filled from the upload result — the `id` field is never set in the upload path. The client receives a 201 with no usable entity ID.

---

### 4.7 `LocaleLibrary` is instantiated as a throw-away side-effect object
**Severity: 🔵 LOW**
**Files:** `app/Controllers/Objects.php:27`, `Photos.php:32`, `Events.php:48`, `Categories.php:28`, `Relay.php:47`

```php
new LocaleLibrary();
```

The object is constructed solely for its constructor side-effect (setting the request locale). The instance is discarded immediately. This is confusing and would be better expressed as a static method call or a before-filter applied globally to routes requiring locale awareness.

---

### 4.8 `PhotosModel::$skipValidation = true` — model-level validation is disabled
**Severity: 🟡 MEDIUM**
**File:** `app/Models/PhotosModel.php:58`

`PhotosModel` defines detailed `$validationRules` but then sets `$skipValidation = true`, rendering them useless. The same pattern exists in `EventsModel`, `EventsUsersModel`, `EventsPhotosModel`, and `UsersModel`. Validation rules are defined but never enforced at the model layer.

---

### 4.9 `Files::image()` — only the last uploaded file gets a `respondCreated()` response
**Severity: 🟡 MEDIUM**
**File:** `app/Controllers/Files.php:184-207`

The `foreach ($files as $key => $file)` loop calls `return $this->respondCreated($fileInfo)` inside the loop body on the first iteration, meaning only the first file in a multi-file upload is acknowledged. Subsequent files in the same request are silently dropped. If zero files match (all already moved), the function falls through to `return $this->failServerError()` at line 214.

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

### 5.1 `Objects::create()` — `name` field validated but stored differently
**Severity: 🟠 HIGH**
**File:** `app/Controllers/Objects.php:111-126`

```php
$rules = [
    'name'  => 'required|min_length[3]|max_length[40]|is_unique[objects.catalog_name]',
    'image' => 'string',
];
// ...
$objectsModel->insert($input);
```

The validation rule checks `$input['name']`, but the `objects` table schema uses `catalog_name` as the primary key. The `ObjectsModel::$allowedFields` does not include `name`. The insert passes the raw `$input` directly — if the JSON contains a `name` key it will be silently discarded by `$protectFields`, and `catalog_name` will be null, causing a database error. The `image` field is not in `$allowedFields` either — the insert would drop it too.

---

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
| 1.1 | 🔴 CRITICAL | Security | CORS wildcard — all origins allowed |
| 1.2 | 🔴 CRITICAL | Security | CSRF protection globally disabled |
| 1.3 | 🟠 HIGH | Security | Auth check runs after validation — timing leak |
| 1.4 | 🟠 HIGH | Security | 422 returned for auth failures instead of 401/403 |
| 1.5 | 🔴 CRITICAL | Security | `/system/recalculate/fits` has no auth |
| 1.6 | 🟠 HIGH | Security | File uploads lack MIME type validation |
| 1.7 | 🟠 HIGH | Security | VK PKCE code verifier is hardcoded constant |
| 1.8 | 🟠 HIGH | Security | SSRF via unvalidated avatar URL download |
| 1.9 | 🟠 HIGH | Security | External FITS fields stored without length validation |
| 1.10 | 🟡 MEDIUM | Security | `die()` in filter bypasses framework response pipeline |
| 1.11 | 🟠 HIGH | Security | JWT secret can be empty/false |
| 1.12 | 🟡 MEDIUM | Security | Telegram messages include unescaped user input |
| 2.1 | 🔴 CRITICAL | Bug | `getLocalizedString()` returns bool instead of string |
| 2.2 | 🟠 HIGH | Bug | `Photos::list()` returns un-enriched data (wrong variable) |
| 2.3 | 🟠 HIGH | Bug | Missing `return` on event-not-found guard in booking/cancel |
| 2.4 | 🟠 HIGH | Bug | `$eventData->registered` accessed before initialization |
| 2.5 | 🟡 MEDIUM | Bug | Missing `return` in `Relay::set()` error paths |
| 2.6 | 🔵 LOW | Bug | Unreachable `return` after try/catch in `Events::create()` |
| 2.7 | 🟠 HIGH | Bug | Wrong datetime format `H:m:s` (month instead of minutes) |
| 2.8 | 🟡 MEDIUM | Bug | Categories written before object existence check |
| 2.9 | 🟡 MEDIUM | Bug | Extra SELECT before UPDATE in `updateUserActivity()` |
| 2.10 | 🔵 LOW | Bug | `$objectHaveUpdates` variable assigned but never read |
| 2.11 | 🔴 CRITICAL | Bug | `Files::updates()` references non-existent class names |
| 2.12 | 🟠 HIGH | Bug | Null dereference before null check in `Photos::download()` |
| 2.13 | 🟡 MEDIUM | Bug | `JSON_LENGTH()` used on integer column instead of `SUM()` |
| 3.1 | 🟡 MEDIUM | Performance | N+1 style separate queries for photos/objects/filters |
| 3.2 | 🟡 MEDIUM | Performance | Entire filters table loaded per request |
| 3.3 | 🟡 MEDIUM | Performance | All FITS records loaded into PHP for aggregation |
| 3.4 | 🔵 LOW | Performance | O(n×m) array search in `Author::list()` |
| 3.5 | 🟡 MEDIUM | Performance | DB query on every request just for token validation |
| 3.6 | 🔵 LOW | Performance | No caching on static list endpoints |
| 4.1 | 🟡 MEDIUM | Quality | Hardcoded Russian strings — not translatable |
| 4.2 | 🔵 LOW | Quality | Auth type constants defined in controller file |
| 4.3 | 🔵 LOW | Quality | Duplicate keys in `UserEntity::$attributes` |
| 4.4 | 🟡 MEDIUM | Quality | `uniqid()` used as primary key — not collision-safe |
| 4.5 | 🟡 MEDIUM | Quality | Update action always returns HTTP 201 instead of 200 |
| 4.6 | 🔵 LOW | Quality | Photo entity missing ID after upload |
| 4.7 | 🔵 LOW | Quality | `LocaleLibrary` instantiated as throw-away side effect |
| 4.8 | 🟡 MEDIUM | Quality | `$skipValidation = true` defeats defined model rules |
| 4.9 | 🟡 MEDIUM | Quality | Multi-file upload returns only first file result |
| 4.10 | 🟡 MEDIUM | Quality | Google userinfo endpoint called with POST instead of GET |
| 5.1 | 🟠 HIGH | Validation | `Objects::create()` validates `name` but inserts `catalog_name` |
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

### Phase 1 — Immediate (before any production deployment)
1. Fix `Files::updates()` undefined class names (2.11) — complete data ingest breakage
2. Fix `getLocalizedString()` boolean OR bug (2.1) — corrupted API responses
3. Add auth to `system/recalculate/fits` (1.5)
4. Fix CORS to use allowlist (1.1)
5. Fix `EventsModel::getUpcomingEvent()` datetime format (2.7)
6. Fix missing `return` statements in `booking()` / `cancel()` (2.3)
7. Fix `photos` migration syntax errors (6.8)

### Phase 2 — High Priority (within one sprint)
8. Fix HTTP status codes for auth failures (1.4)
9. Add MIME type validation to all file uploads (1.6 / 5.5)
10. Fix VK PKCE code verifier to be random (1.7)
11. Fix SSRF in avatar download (1.8)
12. Fix `Photos::list()` returning wrong variable (2.2)
13. Fix `Photos::download()` null dereference (2.12)
14. Fix `JSON_LENGTH()` → `SUM()` for children count (2.13)
15. Fix `Objects::create()` field name mismatch (5.1)
16. Move auth guards before validation in all controllers (1.3)
17. Fix JWT secret key empty string handling (1.11)

### Phase 3 — Medium Priority (next sprint)
18. Replace `uniqid()` with `random_bytes()` for IDs (4.4)
19. Fix `$eventData->registered` initialization (2.4)
20. Fix `Relay::set()` missing returns (2.5)
21. Add composite DB indexes (6.1, 6.2)
22. Add date validation before `Time::parse()` in Events (5.2)
23. Fix `children` default value in migration (6.5)
24. Add FK constraint on `objects_categories.object_name` (6.6)
25. Fix CSRF filter (1.2) — apply to mutation routes
26. Enable model validation (remove `$skipValidation = true`) (4.8)
27. Add HTTP response caching to list endpoints (3.6)

### Phase 4 — Code Quality & Test Coverage
28. Write PHPUnit tests for all controllers and helpers (7.1)
29. Fix phpunit.xml.dist schema version (7.2)
30. Replace hardcoded Russian strings with language files (4.1)
31. Refactor `LocaleLibrary` to a filter (4.7)
32. Optimize N+1 queries with SQL JOINs (3.1–3.3)
33. Fix `die()` in CorsFilter (1.10)
34. Fix `Events::create()` unreachable return (2.6)
35. Fix Google userinfo GET vs POST (4.10)
36. Escape Telegram message content (1.12)
