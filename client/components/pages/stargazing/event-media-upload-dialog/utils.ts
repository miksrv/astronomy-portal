import { ApiModel } from '@/api'

import { ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES, MIME_BY_EXTENSION, UNSUPPORTED_VIDEO_TYPES } from './constants'

export const isAbortError = (error: unknown): boolean => (error as { name?: string } | undefined)?.name === 'AbortError'

export const makeItemId = (file: File, index: number): string =>
    `${file.name}-${file.size}-${file.lastModified}-${index}`

export const fileKey = (file: File): string => `${file.name}-${file.size}-${file.lastModified}`

/**
 * The file's MIME type, falling back to its extension when the browser/OS
 * didn't supply one (`File.type` is empty surprisingly often - see
 * MIME_BY_EXTENSION). Everything else in the dialog classifies a file through
 * this rather than reading `File.type` directly, so a typeless `.mov` still
 * gets its inline error instead of vanishing from the list, and a typeless
 * `.mp4` is still uploadable (the resolved type is what `mediaInit` is told,
 * and the backend sniffs the assembled bytes anyway).
 */
export const getFileMimeType = (file: File): string => {
    if (file.type) {
        return file.type
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

    return MIME_BY_EXTENSION[extension] ?? ''
}

/**
 * Resolves which media pipeline a file belongs to from its MIME type.
 * `undefined` for anything outside ACCEPTED_IMAGE_TYPES/ACCEPTED_VIDEO_TYPES
 * (including an explicitly-unsupported video, see `isUnsupportedVideo`).
 */
export const getMediaType = (file: File): ApiModel.EventMediaType | undefined => {
    const mimeType = getFileMimeType(file)

    if (ACCEPTED_IMAGE_TYPES.includes(mimeType)) {
        return 'photo'
    }

    if (ACCEPTED_VIDEO_TYPES.includes(mimeType)) {
        return 'video'
    }

    return undefined
}

/** A `.mov`/`video/quicktime` file - shown in the selected-files list with an inline error, never uploadable. */
export const isUnsupportedVideo = (file: File): boolean => UNSUPPORTED_VIDEO_TYPES.includes(getFileMimeType(file))
