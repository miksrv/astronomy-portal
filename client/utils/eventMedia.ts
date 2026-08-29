import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'

const createMediaUrl = (media?: ApiModel.EventMedia, preview?: boolean): string => {
    if (!media?.name || !media?.ext || !media?.eventId) {
        return ''
    }

    // A video's preview/poster is always a captured still frame, saved as a
    // JPEG regardless of the video's own container format (mp4/webm) - see
    // "Why extend the existing table" in features/stargazing-event-video-uploads.md.
    // A photo's preview keeps the photo's own extension.
    const ext = preview && media.mediaType === 'video' ? 'jpg' : media.ext

    return `${hosts.stargazing}${media.eventId}/${media.name}${preview ? '_preview' : ''}.${ext}`
}

export const createPreviewMediaUrl = (media?: ApiModel.EventMedia): string => createMediaUrl(media, true)

export const createFullMediaUrl = (media?: ApiModel.EventMedia): string => createMediaUrl(media)
