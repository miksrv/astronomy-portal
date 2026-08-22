import { ApiModel } from '@/api'

import { ACCEPTED_IMAGE_TYPES, ACCEPTED_VIDEO_TYPES, UNSUPPORTED_VIDEO_TYPES } from './constants'

export const isAbortError = (error: unknown): boolean => (error as { name?: string } | undefined)?.name === 'AbortError'

export const makeItemId = (file: File, index: number): string =>
    `${file.name}-${file.size}-${file.lastModified}-${index}`

export const fileKey = (file: File): string => `${file.name}-${file.size}-${file.lastModified}`

/**
 * Resolves which media pipeline a file belongs to from its MIME type.
 * `undefined` for anything outside ACCEPTED_IMAGE_TYPES/ACCEPTED_VIDEO_TYPES
 * (including an explicitly-unsupported video, see `isUnsupportedVideo`).
 */
export const getMediaType = (file: File): ApiModel.EventMediaType | undefined => {
    if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return 'photo'
    }

    if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
        return 'video'
    }

    return undefined
}

/** A `.mov`/`video/quicktime` file - shown in the selected-files list with an inline error, never uploadable. */
export const isUnsupportedVideo = (file: File): boolean => UNSUPPORTED_VIDEO_TYPES.includes(file.type)
