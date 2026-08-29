---
name: project_feat26_media_uploads
description: FEAT-26 (event gallery video uploads / chunked media upload) — backend and frontend both implemented, shipped in release 4.11.0
metadata:
  type: project
---

FEAT-26 (spec: `features/stargazing-event-video-uploads.md`) adds video to the stargazing event gallery (previously photo-only) via a chunked upload protocol, and renames the photo-only `events_photos`/`EventsPhotosModel`/`EventPhotoEntity`/`GET events/photos`/`Events::upload` surface to the media-neutral `events_media`/`EventsMediaModel`/`EventMediaEntity`/`GET events/media`/`Events::mediaInit`+`mediaChunk`+`mediaFinalize`+`mediaCancel`.

**Backend (BE-1..BE-8) was implemented 2026-08-21** — see `git log` on `server/app/Controllers/Events.php`, the two `2026-08-21-*` migrations, `EventsMediaModel`/`EventsMediaUploadsModel`, `EventMediaEntity`/`EventMediaUploadEntity`, and `app/Commands/CleanupMediaUploads.php` for current state (this memory is a pointer, not a substitute for reading that code — verify it still matches before relying on any name below).

Deviations from the spec worth knowing about if picking this back up:
- Two language keys beyond the two BE-8 explicitly named (`unsupportedVideoFormat`, `missingUploadChunks`) were added because they were needed for the feature to actually respond with real messages: `General.fileTooLarge` (the `MEDIA_UPLOAD_MAX_SIZE` ceiling rejection in `mediaInit`) and `Events.uploadSessionNotActive` (a 409 when a chunk/finalize call targets a session that's already completed/aborted/finalizing).
- `mediaCancel()` hard-deletes the `events_media_uploads` row and its temp dir immediately (chosen over "mark aborted, let the 24h cleanup sweep delete it" — spec offered either as acceptable) so the "cancel removes temp chunks" acceptance criterion holds without waiting on the cron.
- `mediaFinalize()`'s chunk-count-vs-assembled-size mismatch case (should be unreachable once every chunk index is confirmed present, but guards a truncated/corrupted part file) reuses the `Events.missingUploadChunks` message with the full `0..N-1` range rather than inventing a third upload-error message.

**Frontend (FE-1..FE-8) was implemented on the same `feature/media` branch** and shipped together with the backend in release 4.11.0 — `EventMediaUploadDialog` + `chunkedUpload.ts` (init/chunk/finalize/cancel client), `EventMediaFilter`, video tiles in `PhotoGallery`, `VideoSlide` in `PhotoLightbox`, and `client/utils/eventMedia.ts`. The old `EventPhotoUploadDialog`/`eventPhotos.ts`/single-request `POST /events/upload/:id` surface is gone.

Remaining work is verification/ops, not implementation: `media:cleanup-uploads` still has to be added to the hosting crontab by hand (see "CLI Commands" in `server/CLAUDE.md`), and the flow has only been exercised locally — a real large-video upload over a slow connection against production's PHP/upload limits hasn't been done yet. See [[feedback_ci4_forge_rename_table_keeps_index_names]] for a CI4-specific gotcha hit while writing the rename migration.
