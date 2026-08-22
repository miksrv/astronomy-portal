# FEAT-26 — Event Gallery Video Uploads (Chunked Media Upload)

**Status:** Implemented — pending verification against a live database (migrations not yet run) and manual end-to-end testing
**Priority:** Medium
**Affects:** Backend (CodeIgniter 4) + Frontend (Next.js) + Database
**Parallel implementation:** Backend and Frontend can work in parallel once the chunked-upload API contract (init/chunk/finalize/cancel) is agreed.

---

## Overview

Stargazing event pages (e.g. `/stargazing/6a82b4e51985d`) currently let privileged users (`events.gallery_upload`) upload **photos only**, via `EventPhotoUploadDialog` → `POST /events/upload/:id` → the `events_photos` table. Add **video** to the same gallery, uploaded from the same dialog, so an event's photo and video contributions live in one chronological feed instead of two separate places.

This also folds in a second, independently-motivated change: today's single-request upload has no real ceiling beyond the PHP `upload_max_filesize`/`post_max_size` the shared hosting environment happens to allow (the dev server sets 70MB via `-d` flags in `composer serve`; production is FTP-deployed to shared hosting with unknown, possibly lower, hard caps — see "Deployment" in `CLAUDE.md`). Video files make that ceiling a real, frequent problem in a way photos rarely hit. Rather than pick an arbitrary size cap and hit it constantly, this spec replaces the single-request upload with a **chunked upload** (client splits the file into ~10–15MB pieces; server reassembles), which removes the practical size ceiling for both videos and any unusually large photo, at the cost of a slightly more involved upload protocol.

---

## Business Rules

1. **No new privilege.** Video upload is gated by the same `Permission::EVENTS_GALLERY_UPLOAD` already used for photos — this is additional capability on an existing privilege, not a new access surface.
2. **Accepted video formats: `video/mp4` and `video/webm` only** — explicitly rejects `video/quicktime` (`.mov`), even though it's the default export format on iPhones. Rationale: there is no server-side transcoding (see "Why no server-side thumbnail/transcoding" below), so whatever format is uploaded is exactly what every visitor's browser has to play back directly via `<video>`. `.mov` (`video/quicktime`) does not play reliably in Chrome/Firefox as a direct `<video src>` outside Safari/macOS/iOS. The upload dialog must surface a clear message telling the uploader to export/convert to MP4 first, rather than silently accepting a file that will look broken to most visitors.
3. **No UX-facing size or duration limit.** The chunked protocol removes the single-request ceiling, so there's no product reason to invent one. A generous **server-side safety ceiling only** (config constant, suggested default 2GB per file) guards disk space against abuse — not surfaced in the UI, and irrelevant for realistic event footage, since the endpoint is already privilege-gated to trusted uploaders.
4. **Poster frame is generated client-side, not server-side.** The shared PHP hosting backend has no `ffmpeg`/`ffprobe`/`getID3` anywhere in the codebase today, and shared hosting typically disables `shell_exec` or doesn't have `ffmpeg` installed at all — server-side frame extraction is not a reliable option. Instead, the browser extracts the poster frame (via an offscreen `<video>` + `<canvas>`, seeking to `min(1s, duration/2)`) and the video's `duration`/`videoWidth`/`videoHeight`, then uploads the poster alongside the video — the same pattern already used for client-side EXIF `takenAt` extraction in `EventPhotoUploadDialog`. The server never needs to look inside the video file's content, only store it and the client-supplied metadata.
5. **Gallery grid tiles show a poster image + a play-icon badge, not autoplaying video.** No inline autoplay/loop in the grid: better for mobile data/battery, and it's the same interaction model already used for photos (static tile → click → lightbox). No intersection-observer/play-management complexity needed as a result.
6. **The existing rows-masonry gallery layout (`RowsPhotoAlbum`) needs no layout changes for video.** It already packs each item into a row purely from its `width`/`height` — a portrait video's poster is sized exactly like a portrait photo is today (a narrow column within its row, not stretched full-width). The only additions are the play-icon overlay and, in the lightbox, a video-capable slide renderer.
7. **The lightbox plays the actual video, `contain`-fit.** `PhotoLightbox`'s `ImageSlide.tsx` already computes a box that fits a slide into the viewport by real aspect ratio (not stretched, not cropped) for anything that isn't in "cover" mode. A new `VideoSlide.tsx` reuses that same sizing math and renders `<video controls playsInline>` instead of `next/image` — a portrait video is centered at its natural aspect ratio, exactly like a portrait photo is today.
8. **Abandoned chunked uploads are cleaned up automatically.** A user who starts uploading and never finishes (closes the tab, network dies permanently) leaves partial chunks on disk and an `uploading`-status session row. A scheduled command purges sessions (and their chunk directories) older than 24 hours, mirroring the existing `system:send-email`/`system:send-push` cron command pattern.

---

## Why extend the existing table, not create a second one — with one caveat

The **finished gallery content** (a photo or a video that's been fully uploaded and is ready to display) belongs in **one table**, not two:

- The gallery is a single chronological, paginated, photographer-filterable feed — exactly what `EventsPhotosModel::getPhotoList()`/`countPhotoList()`/`getDistinctPhotographers()` already provide. Splitting photos and videos into separate tables would force every one of those queries to become a `UNION`, purely to recreate what one table already gives for free.
- Photos and videos share the overwhelming majority of their columns as-is: `event_id`, `user_id`, `photographer_name`, `taken_at`, `file_name`, `file_ext`, `file_size`, and the pixel dimensions used for gallery layout. Only two attributes are genuinely video-specific: a type discriminator and `duration`.
- The poster frame doesn't need its own column either — it reuses the existing `{file_name}_preview.{ext}` convention already used for photo thumbnails, with one fixed rule: for a video row, the preview file is always `.jpg` regardless of the video's own `file_ext` (a poster is always a captured still frame, saved as JPEG).

**The caveat:** chunked upload needs somewhere to track an *in-progress* upload (which chunks have arrived, for which event/user, so far) — this is a fundamentally different kind of data from finished gallery content (ephemeral, not displayed, cleaned up automatically) and does **not** belong in the same table as finished media. That's a small, separate, new table — see `events_media_uploads` below.

---

## Naming

This also renames the `photos`-specific names in this part of the codebase to the more accurate `media`, end to end, matching the mixed photo/video content they now hold:

| Old | New |
|---|---|
| `events_photos` (table) | `events_media` |
| `EventsPhotosModel` | `EventsMediaModel` |
| `EventPhotoEntity` | `EventMediaEntity` |
| `ApiModel.EventPhoto` (frontend type) | `ApiModel.EventMedia` |
| `EventPhotoUploadDialog` | `EventMediaUploadDialog` |
| `EventPhotoFilter` (photographer chip filter — unchanged behavior, renamed for consistency) | `EventMediaFilter` |
| `eventGetPhotoList` / `eventPhotoUploadPost` (RTK Query hooks) | `eventGetMediaList` / `eventMediaUploadPost` (plus new init/chunk/finalize/cancel hooks) |
| `GET /events/photos` | `GET /events/media` |
| `POST /events/upload/:id` | replaced by `POST /events/media/init/:id` → `POST /events/media/chunk/:sessionId` (repeated) → `POST /events/media/finalize/:sessionId` |

---

## Database Schema

### Migration 1 — rename `events_photos` → `events_media`, add video columns

**File:** `server/app/Database/Migrations/{timestamp}_RenameEventsPhotosToEventsMedia.php`

- Rename table `events_photos` → `events_media`.
- Rename column `image_width` → `width`, `image_height` → `height` (dropping the now-inaccurate "image" prefix, since these describe a video's frame dimensions too).
- Add `media_type ENUM('photo', 'video') NOT NULL DEFAULT 'photo'` (after `user_id`) — backfills every existing row as `'photo'` for free via the default.
- Add `duration SMALLINT UNSIGNED NULL` (after `height`) — seconds, video only, `NULL` for photos.
- Existing index `idx_events_photos_event_taken_at` on `(event_id, taken_at)` carries over unchanged (rename the index too, for consistency, but no structural change).

`down()` reverses all of the above.

### Migration 2 — new `events_media_uploads` table (chunked-upload session bookkeeping)

**File:** `server/app/Database/Migrations/{timestamp}_AddEventsMediaUploads.php`

```
id               VARCHAR(15)  PK
event_id         VARCHAR(15)  NOT NULL, FK -> events.id CASCADE
user_id          VARCHAR(15)  NOT NULL, FK -> users.id CASCADE
media_type       ENUM('photo', 'video') NOT NULL
original_file_name VARCHAR(255) NOT NULL
mime_type        VARCHAR(100) NOT NULL
total_size       BIGINT UNSIGNED NOT NULL
chunk_size       INT UNSIGNED NOT NULL
received_bytes   BIGINT UNSIGNED NOT NULL DEFAULT 0
status           ENUM('uploading', 'finalizing', 'completed', 'aborted') NOT NULL DEFAULT 'uploading'
created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
```

Each session also gets a matching temp directory on disk (`UPLOAD_EVENTS/{eventId}/tmp/{sessionId}/`) holding one file per received chunk (`{index}.part`), reassembled in order at finalize time and deleted afterward (success or cancel).

---

## Backend Tasks

### BE-1 — Rename model/entity/controller methods (`Events.php`, `EventsPhotosModel` → `EventsMediaModel`, `EventPhotoEntity` → `EventMediaEntity`)

Mechanical rename following the table above; `Events::photos()` → `Events::media()`, response field additions: each item gains `mediaType` (`'photo' | 'video'`) and `duration` (video only).

### BE-2 — Route changes

**File:** `server/app/Config/Routes.php`, inside the existing `events` group:

```php
$routes->get('media', 'Events::media');                        // was: get('photos', 'Events::photos')
$routes->post('media/init/(:alphanum)', 'Events::mediaInit/$1');
$routes->post('media/chunk/(:alphanum)', 'Events::mediaChunk/$1');
$routes->post('media/finalize/(:alphanum)', 'Events::mediaFinalize/$1');
$routes->delete('media/(:alphanum)', 'Events::mediaCancel/$1');
// remove: post('upload/(:alphanum)', 'Events::upload/$1')
```

### BE-3 — `Events::mediaInit($eventId)`

Auth + `EVENTS_GALLERY_UPLOAD` guard (same as today's `upload()`). Body: `{ fileName, mimeType, totalSize, mediaType }`.

- Validates `mimeType` against the allowed set (`image/jpeg|png|webp|gif` for `mediaType=photo`, `video/mp4|webm` for `mediaType=video`) — reject with the existing `General.invalidFileType` message otherwise (this is where the `.mov` rejection from Business Rule 2 happens).
- Validates `totalSize` against the safety ceiling (Business Rule 3); reject if over.
- Creates an `events_media_uploads` row (`status = 'uploading'`) and the temp chunk directory.
- Returns `{ sessionId, chunkSize }` — `chunkSize` is server-authoritative (a config constant, e.g. `MEDIA_UPLOAD_CHUNK_SIZE = 12 * 1024 * 1024`) so the client doesn't hardcode it.

### BE-4 — `Events::mediaChunk($sessionId)`

Auth guard + verifies the session belongs to the current user and is still `status = 'uploading'`. Multipart body: `chunkIndex` (int) + `chunk` (binary). Writes `{chunkIndex}.part` into the session's temp directory (overwriting on retry is fine — idempotent), increments `received_bytes`. Returns the current set of received chunk indices, so the client can verify nothing was dropped (and, as a future extension, resume after a reload without re-sending chunks already on disk).

### BE-5 — `Events::mediaFinalize($sessionId)`

Auth guard, same ownership/status check. Multipart body: optional `photographerName`, optional `takenAt` (photo) or required `duration`/`width`/`height` + a `poster` file (video).

1. Verify every chunk index `0..N-1` (`N = ceil(totalSize / chunkSize)`) is present on disk; if any is missing, respond with a validation error naming the missing index (client re-sends just that chunk and retries finalize) rather than failing the whole upload.
2. Concatenate the chunk files in order into the final upload path, verify the assembled size matches `total_size`.
3. **Photo path:** run the same GD orient/resize/preview pipeline `Events::upload()` already has today, unchanged.
4. **Video path:** move the assembled file as-is (no server-side processing possible — see Business Rule 4); save the client-supplied `poster` file as `{file_name}_preview.jpg`; store `duration`/`width`/`height` as given by the client.
5. Insert the `events_media` row, delete the temp chunk directory, mark the upload session `status = 'completed'`.
6. Response shape mirrors today's `upload()` response, plus `mediaType`/`duration`.

### BE-6 — `Events::mediaCancel($sessionId)`

Auth + ownership guard. Deletes the temp chunk directory and the `events_media_uploads` row (or marks `status = 'aborted'` and lets the cleanup command delete it — either is fine, pick whichever is simpler to implement alongside BE-7). Wired to the upload dialog's existing "Cancel" action.

### BE-7 — Cleanup command: `media:cleanup-uploads`

**File:** `server/app/Commands/CleanupMediaUploads.php`

Runs on a schedule (same mechanism as `system:send-email`/`system:send-push`). Finds `events_media_uploads` rows with `status IN ('uploading', 'finalizing')` and `created_at` older than 24 hours, deletes their temp chunk directories, deletes the rows.

### BE-8 — Language files

New keys for: unsupported video format (`.mov` rejection message), missing-chunk-on-finalize validation error. Everything else reuses `General.fileUploadFailed` / `General.invalidFileType` / `App.accessDenied`.

---

## Frontend Tasks

### FE-1 — Rename `EventPhotoUploadDialog` → `EventMediaUploadDialog` (and sibling files)

Same directory-per-component structure (`constants.ts`, `utils.ts`, `styles.module.sass`), following the naming table above.

### FE-2 — Client-side video metadata + poster extraction

**New file:** `client/components/pages/stargazing/event-media-upload-dialog/video.ts`

`extractVideoMetadata(file: File): Promise<{ width: number; height: number; duration: number; poster: Blob }>` — offscreen `<video>` + `<canvas>`, per Business Rule 4. Mirrors the existing EXIF-extraction call site structurally (best-effort try/catch around an otherwise-independent per-file step in the upload queue), but unlike EXIF this is **required** for a video item to upload successfully, not an optional enrichment — surface a clear per-file error (not a silent skip) if metadata extraction fails (e.g. an unsupported codec the browser itself can't decode).

### FE-3 — Chunked upload client

**New file:** `client/components/pages/stargazing/event-media-upload-dialog/chunkedUpload.ts`

Replaces the single `handleUploadPhoto` mutation call in `processItem()` with an init → sliced-chunk loop → finalize sequence per queue item, reusing the existing per-item status machine (`pending/uploading/done/error/canceled`) and the existing abort/cancel plumbing (`abortMapRef`) — a cancel now needs to also call `mediaCancel` server-side instead of just aborting an in-flight fetch, so the temp chunk directory doesn't linger unnecessarily until the 24h cleanup sweep.

New RTK Query mutations in `client/api/api.ts`: `eventMediaUploadInit`, `eventMediaUploadChunk`, `eventMediaUploadFinalize`, `eventMediaUploadCancel`.

### FE-4 — Accept video files in the drop zone

**File:** `client/components/pages/stargazing/event-media-upload-dialog/constants.ts`

```ts
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
export const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES]
```

A dropped/selected `video/quicktime` file is not silently filtered out like a wrong-type file is today — show it in the selected-files list with an inline "unsupported format, export as MP4" error state so the uploader understands why it won't upload, rather than it just vanishing.

### FE-5 — Gallery: render video tiles

**File:** `client/components/common/photo-gallery/PhotoGallery.tsx` (or a light wrapper, given the rename — evaluate at implementation time whether `PhotoGallery` itself becomes `MediaGallery` or stays generic and just accepts richer item data)

Each gallery item gains `mediaType` and, for video, a `posterSrc` (server-generated preview path, same as a photo's `_preview`) plus `duration`. `renderImage()` gets a video branch: same `next/image fill` poster rendering, plus a centered play-icon overlay and a small duration badge (e.g. `0:42`) in a corner — no change to `withAspectRatio`/row-packing, since both still key off real `width`/`height`.

### FE-6 — Lightbox: video-capable slide

**New file:** `client/components/common/photo-lightbox/VideoSlide.tsx`

Same box-fit sizing logic as `ImageSlide.tsx` (Business Rule 7), rendering `<video controls playsInline src={...} poster={...}>` instead of `next/image`. `PhotoLightbox.tsx`'s `render.slide` branches on a `type: 'video' | undefined` field per slide (YARL's documented mixed-slide-type pattern) instead of unconditionally using `ImageSlide`. Pause-on-navigate: reset/pause the video when the lightbox moves to a different slide, same lifecycle as `ImageSlide`'s load-reset effect on `slide.src` changes.

### FE-7 — i18n

New keys under `components.pages.stargazing.event-media-upload-dialog` (RU + EN, both locale files): video drop-zone copy, unsupported-format message, per-chunk progress phrasing if the progress UI needs to distinguish "uploading" from "assembling" (finalize can take a moment for a large video).

### FE-8 — Run after changes

```bash
yarn eslint:fix && yarn prettier:fix && yarn test
```

---

## Acceptance Criteria

- [ ] A privileged user can upload an MP4/WebM video from the same dialog used for photos, in the same batch as photos
- [ ] A `.mov` (`video/quicktime`) file is rejected in the dialog with a clear "convert to MP4" message, never silently dropped or uploaded
- [ ] A video larger than the old single-request ceiling (e.g. 150MB) uploads successfully via chunking, with visible per-chunk progress
- [ ] A vertical (portrait) video's grid tile is not full-width/stretched — it's sized by its real aspect ratio, same as a portrait photo today
- [ ] Clicking a video tile opens the lightbox and plays the video, centered and `contain`-fit at its natural aspect ratio, not cropped or stretched
- [ ] Canceling an in-progress video upload removes its temp chunks server-side (verified by checking the upload directory, not just the UI state)
- [ ] An upload session abandoned mid-batch (tab closed) is cleaned up by `media:cleanup-uploads` within 24 hours
- [ ] `GET /events/media` returns both photos and videos in one chronologically-sorted, paginated, photographer-filterable feed
- [ ] Existing photo upload/display behavior is unchanged end-to-end after the `events_photos` → `events_media` rename (regression-tested, not just newly-added video behavior)
