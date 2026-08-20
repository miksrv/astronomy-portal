export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ACCEPTED_TYPES_ATTR = ACCEPTED_TYPES.join(',')
// Concurrent upload requests in flight at once - a middle ground between
// one-at-a-time (slow for large batches) and firing every file at once
// (risks overwhelming the server/connection on a big gallery dump).
export const UPLOAD_CONCURRENCY = 4
