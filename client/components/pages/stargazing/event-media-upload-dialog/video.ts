// Upper bound on how long the browser gets to decode a video's metadata and
// render its poster frame before the file is treated as unreadable.
const METADATA_TIMEOUT_MS = 30_000

/**
 * Why the browser couldn't produce a video's metadata/poster. A stable code
 * rather than a message: the failure is rendered to the user through the
 * dialog's `getErrorMessage`, and only the component has `t()` - a message
 * baked in here would be shown untranslated to an English-locale visitor.
 */
export type VideoMetadataErrorCode =
    /** The container/codec couldn't be decoded at all (or took too long to). */
    | 'decode'
    /** Decoded, but the reported dimensions/duration are unusable. */
    | 'metadata'
    /** Decoded, but the poster frame couldn't be captured/encoded. */
    | 'poster'

export class VideoMetadataError extends Error {
    public readonly code: VideoMetadataErrorCode

    public constructor(code: VideoMetadataErrorCode) {
        super(`Video metadata extraction failed: ${code}`)
        this.name = 'VideoMetadataError'
        this.code = code
    }
}

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
            reject(new VideoMetadataError('decode'))
        }, METADATA_TIMEOUT_MS)

        const video = document.createElement('video')
        video.preload = 'metadata'
        video.muted = true
        video.playsInline = true

        const fail = (error: VideoMetadataError) => {
            clearTimeout(timeoutId)
            reject(error)
        }

        video.onerror = () => fail(new VideoMetadataError('decode'))

        video.onloadedmetadata = () => {
            const { videoWidth, videoHeight, duration } = video

            if (!videoWidth || !videoHeight || !Number.isFinite(duration) || duration <= 0) {
                fail(new VideoMetadataError('metadata'))
                return
            }

            video.onseeked = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = videoWidth
                    canvas.height = videoHeight

                    const context = canvas.getContext('2d')

                    if (!context) {
                        fail(new VideoMetadataError('poster'))
                        return
                    }

                    context.drawImage(video, 0, 0, videoWidth, videoHeight)

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                fail(new VideoMetadataError('poster'))
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
                } catch {
                    fail(new VideoMetadataError('poster'))
                }
            }

            video.onerror = () => fail(new VideoMetadataError('decode'))
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
