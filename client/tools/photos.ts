import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'

const createPhotoUrl = (
    photo?: ApiModel.Photo,
    size?: 'small' | 'medium' | 'large'
): string => {
    if (!photo?.fileName || !photo?.fileExt || !photo?.dirName) {
        return ''
    }

    return `${hosts.photo}${photo.dirName}/${photo.fileName}_${size}.${photo?.fileExt}`
}

export const createSmallPhotoUrl = (photo?: ApiModel.Photo): string =>
    createPhotoUrl(photo, 'small')

export const createMediumPhotoUrl = (photo?: ApiModel.Photo): string =>
    createPhotoUrl(photo, 'medium')

export const createLargePhotoUrl = (photo?: ApiModel.Photo): string =>
    createPhotoUrl(photo, 'large')
