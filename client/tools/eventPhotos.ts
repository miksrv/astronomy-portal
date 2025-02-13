import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'

const createPhotoUrl = (
    photo?: ApiModel.EventPhoto,
    preview?: boolean
): string => {
    if (!photo?.name || !photo?.ext || !photo?.eventId) {
        return ''
    }

    return `${hosts.stargazing}${photo.eventId}/${photo.name}${
        preview ? '_preview' : ''
    }.${photo?.ext}`
}

export const createPreviewPhotoUrl = (photo?: ApiModel.EventPhoto): string =>
    createPhotoUrl(photo, true)

export const createFullPhotoUrl = (photo?: ApiModel.EventPhoto): string =>
    createPhotoUrl(photo)
