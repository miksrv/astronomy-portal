export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// `video/quicktime` (.mov) is deliberately NOT in here - see
// UNSUPPORTED_VIDEO_TYPES below. There is no server-side transcoding, so a
// format that doesn't play reliably via a direct <video src> in Chrome/Firefox
// (unlike Safari/macOS/iOS) can't be accepted at all.
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm']

export const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES]

// `.mov` is the default export format on iPhones, so it's a common, expected
// mistake - a dropped/selected .mov file must still show up in the selected
// files list (with a clear "export to MP4" inline error) instead of vanishing
// silently like a genuinely unrecognized file type does. It is never
// includable in ACCEPTED_TYPES/ACCEPTED_TYPES_ATTR's upload path.
export const UNSUPPORTED_VIDEO_TYPES = ['video/quicktime']

// Passed to the file input's `accept` attribute and used as the drag/drop
// allow-list - includes the unsupported types too, purely so they can be
// selected and shown with their inline error instead of being invisible to
// the file picker or ignored on drop.
export const ACCEPTED_TYPES_ATTR = [...ACCEPTED_TYPES, ...UNSUPPORTED_VIDEO_TYPES].join(',')

// Concurrent upload requests in flight at once - a middle ground between
// one-at-a-time (slow for large batches) and firing every file at once
// (risks overwhelming the server/connection on a big gallery dump). Applies
// per-chunk too: each queue worker still uploads one file's chunks
// sequentially, but up to this many files chunk-upload in parallel.
export const UPLOAD_CONCURRENCY = 4
