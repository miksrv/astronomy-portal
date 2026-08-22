import { API, ApiModel } from '@/api'

import { isAbortError } from './utils'

export interface ChunkedUploadMeta {
    photographerName?: string
    /** Photo-only. */
    takenAt?: string
    /** Video-only, from `extractVideoMetadata`. */
    duration?: number
    width?: number
    height?: number
    poster?: Blob
}

export interface ChunkedUploadHandlers {
    initMedia: ReturnType<typeof API.useEventMediaUploadInitMutation>[0]
    uploadChunk: ReturnType<typeof API.useEventMediaUploadChunkMutation>[0]
    finalizeMedia: ReturnType<typeof API.useEventMediaUploadFinalizeMutation>[0]
    cancelMedia: ReturnType<typeof API.useEventMediaUploadCancelMutation>[0]
}

export interface ChunkedUploadOptions {
    eventId: string
    file: File
    mediaType: ApiModel.EventMediaType
    meta: ChunkedUploadMeta
    /** Replaces the queue item's current abort callback (`EventMediaUploadDialog`'s `abortMapRef`) with the one for whichever request is in flight right now. */
    registerAbort: (abort: () => void) => void
    clearAbort: () => void
    /** 0..1 fraction of this file's chunk-upload phase - lets the dialog's overall Progress bar reflect bytes within a large file, not just "N of M files". */
    onProgress: (fraction: number) => void
    /** Fires once, right before the finalize request - finalize can take a moment for a large video (server-side reassembly), so the dialog shows a distinct "assembling…" status for it. */
    onPhaseChange: (phase: 'uploading' | 'finalizing') => void
    isCanceled: () => boolean
}

export type ChunkedUploadResult =
    { status: 'done'; media: ApiModel.EventMedia } | { status: 'canceled' } | { status: 'error'; error: unknown }

/**
 * Uploads one file end-to-end via the chunked protocol: init -> N sliced
 * `file.slice()` chunk requests -> finalize. Mirrors the single-item status
 * machine `EventMediaUploadDialog` already uses for photos (pending/
 * uploading/done/error/canceled) - the outcome is reported via the returned
 * `status` rather than a thrown exception, so a cancel/error looks the same
 * as a resolved promise from the caller's point of view.
 *
 * A cancellation that lands after `init` already produced a `sessionId`
 * calls `mediaCancel` here (best-effort - a failure just means the 24h
 * cleanup sweep catches it instead) so the server's temp chunk directory
 * doesn't linger unnecessarily. The caller only needs to abort the in-flight
 * request and flip `isCanceled()`; it doesn't need to know sessions exist.
 */
export const uploadMediaInChunks = async (
    handlers: ChunkedUploadHandlers,
    options: ChunkedUploadOptions
): Promise<ChunkedUploadResult> => {
    const { eventId, file, mediaType, meta, registerAbort, clearAbort, onProgress, onPhaseChange, isCanceled } = options
    const { initMedia, uploadChunk, finalizeMedia, cancelMedia } = handlers

    if (isCanceled()) {
        return { status: 'canceled' }
    }

    const initRequest = initMedia({
        eventId,
        fileName: file.name,
        mediaType,
        mimeType: file.type,
        totalSize: file.size
    })
    registerAbort(() => initRequest.abort())

    const initResult = await initRequest
    clearAbort()

    if ('error' in initResult) {
        return isAbortError(initResult.error) ? { status: 'canceled' } : { status: 'error', error: initResult.error }
    }

    const { sessionId, chunkSize } = initResult.data

    const cancelSession = () => {
        // Fire-and-forget - see the "best-effort" note above.
        void cancelMedia({ sessionId }).catch(() => undefined)
    }

    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize))

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        if (isCanceled()) {
            cancelSession()
            return { status: 'canceled' }
        }

        const start = chunkIndex * chunkSize
        const chunkFormData = new FormData()
        chunkFormData.append('chunkIndex', String(chunkIndex))
        chunkFormData.append('chunk', file.slice(start, start + chunkSize))

        const chunkRequest = uploadChunk({ formData: chunkFormData, sessionId })
        registerAbort(() => chunkRequest.abort())

        const chunkResult = await chunkRequest
        clearAbort()

        if ('error' in chunkResult) {
            if (isAbortError(chunkResult.error)) {
                cancelSession()
                return { status: 'canceled' }
            }
            return { status: 'error', error: chunkResult.error }
        }

        onProgress((chunkIndex + 1) / totalChunks)
    }

    if (isCanceled()) {
        cancelSession()
        return { status: 'canceled' }
    }

    onPhaseChange('finalizing')

    const finalizeFormData = new FormData()

    if (meta.photographerName) {
        finalizeFormData.append('photographerName', meta.photographerName)
    }

    if (mediaType === 'video') {
        finalizeFormData.append('duration', String(meta.duration))
        finalizeFormData.append('width', String(meta.width))
        finalizeFormData.append('height', String(meta.height))

        if (meta.poster) {
            finalizeFormData.append('poster', meta.poster, 'poster.jpg')
        }
    } else if (meta.takenAt) {
        finalizeFormData.append('takenAt', meta.takenAt)
    }

    const finalizeRequest = finalizeMedia({ eventId, formData: finalizeFormData, sessionId })
    registerAbort(() => finalizeRequest.abort())

    const finalizeResult = await finalizeRequest
    clearAbort()

    if ('error' in finalizeResult) {
        if (isAbortError(finalizeResult.error)) {
            cancelSession()
            return { status: 'canceled' }
        }
        return { status: 'error', error: finalizeResult.error }
    }

    return { status: 'done', media: finalizeResult.data }
}
