// Upper bound on how long the browser gets to decode a video's metadata and
// render its poster frame before the file is treated as unreadable.
const METADATA_TIMEOUT_MS = 30_000

export interface VideoMetadata {
    width: number
    height: number
    /** Seconds, rounded - matches the backend's `SMALLINT` `duration` column. */
    duration: number
    /** Captured still frame, JPEG-encoded - uploaded as the `poster` field on finalize. */
    poster: Blob
}

/**
 * Extracts a video's natural dimensions/duration and a poster frame, entirely
 * client-side - the shared PHP hosting backend has no ffmpeg/ffprobe/getID3
 * anywhere to do this server-side (see "Business Rules" in
 * features/stargazing-event-video-uploads.md). Seeks to `min(1s, duration/2)`
 * so the poster isn't a black first frame.
 *
 * Unlike the EXIF `takenAt` read for photos (best-effort, silently omitted on
 * failure), a failure here IS a real per-file upload error - the caller must
 * surface it (e.g. via the queue item's `error` state), not skip the file
 * silently, since a video can't be uploaded at all without this metadata.
 */
export const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
    const objectUrl = URL.createObjectURL(file)

    const promise = new Promise<VideoMetadata>((resolve, reject) => {
        // A container the browser can't make sense of may fire neither
        // `loadedmetadata` nor `error` - without this the promise would never
        // settle, and since the upload worker awaits it, the whole batch would
        // hang with no way out: Cancel only flips a flag that's checked
        // *between* awaits, so it can't unstick an await that never resolves.
        const timeoutId = setTimeout(() => {
            reject(new Error('Не удалось прочитать видеофайл'))
        }, METADATA_TIMEOUT_MS)

        const video = document.createElement('video')
        video.preload = 'metadata'
        video.muted = true
        video.playsInline = true

        const fail = (error: Error) => {
            clearTimeout(timeoutId)
            reject(error)
        }

        video.onerror = () => fail(new Error('Не удалось прочитать видеофайл'))

        video.onloadedmetadata = () => {
            const { videoWidth, videoHeight, duration } = video

            if (!videoWidth || !videoHeight || !Number.isFinite(duration) || duration <= 0) {
                fail(new Error('Не удалось определить параметры видео'))
                return
            }

            video.onseeked = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = videoWidth
                    canvas.height = videoHeight

                    const context = canvas.getContext('2d')

                    if (!context) {
                        fail(new Error('Не удалось создать превью видео'))
                        return
                    }

                    context.drawImage(video, 0, 0, videoWidth, videoHeight)

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                fail(new Error('Не удалось создать превью видео'))
                                return
                            }

                            clearTimeout(timeoutId)
                            resolve({
                                duration: Math.round(duration),
                                height: videoHeight,
                                poster: blob,
                                width: videoWidth
                            })
                        },
                        'image/jpeg',
                        0.85
                    )
                } catch (error) {
                    fail(error as Error)
                }
            }

            video.onerror = () => fail(new Error('Не удалось прочитать видеофайл'))
            video.currentTime = Math.min(1, duration / 2)
        }

        video.src = objectUrl
    })

    // Always release the blob URL, whether extraction succeeded or failed -
    // this is the file's only reference, an unreleased one leaks memory for
    // the rest of the page's lifetime.
    return promise.finally(() => {
        URL.revokeObjectURL(objectUrl)
    })
}
