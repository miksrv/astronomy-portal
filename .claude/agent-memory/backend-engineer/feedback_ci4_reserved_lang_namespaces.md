---
name: CI4 reserved language file namespaces
description: Some app/Language/{locale}/*.php names collide with CodeIgniter's own framework language files — check before creating a new one
type: feedback
---

CodeIgniter 4 ships its own `system/Language/{locale}/*.php` files (e.g. `Files.php`, `Validation.php`) used internally by framework classes. `app/Language/{locale}/X.php` does not merge with `system/Language/{locale}/X.php` — if a file with the same name exists at the app level, CI4 loads only the app one, silently replacing every key the framework file defined.

`Files` is one such reserved namespace: `CodeIgniter\Files\Exceptions\FileException`/`FileNotFoundException` throw messages via `lang('Files.cannotMove', ...)`, `lang('Files.fileNotFound', ...)`, etc., triggered whenever code calls `UploadedFile::move()` — used in `PhotoUploadLibrary`, and in `Mailings.php`/`Events.php`/`PushNotifications.php` upload handlers. This project already had a legitimate `app/Language/ru/Files.php` overriding *only* those framework keys (RU translations CI4 doesn't ship out of the box) — it must keep exactly those four keys (`fileNotFound`, `cannotMove`, `expectedDirectory`, `expectedFile`) and nothing else.

**Why:** While migrating `Controllers/Files.php` (the app's own file-serving controller, unrelated to the framework's `Files` upload-exception namespace) to the new error-response contract, a new `Files` language file was almost created for the controller's own strings, which would have clobbered the existing RU override and left EN with no override — both would have broken translated file-move error messages elsewhere in the app.

**How to apply:** Before adding a new `app/Language/{locale}/<Name>.php`, check `vendor/codeigniter4/framework/system/Language/{en,ru}/<Name>.php` for a same-named framework file. If one exists and the app already has a matching override, only ever add/edit keys that belong to that same concern — never repurpose the file for unrelated (e.g. controller-specific) strings. For a controller whose name would collide (like `Files`), use a distinct language file name (e.g. `FilesController.php`) instead of reusing the controller's own name.
