import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { formatDate } from '@/tools/dates'
import { formatObjectName } from '@/tools/strings'
import { TFunction } from 'i18next'

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

export const createPhotoTitle = (photo?: ApiModel.Photo, t?: TFunction) =>
    `${t?.('photo')} ${photo?.objects
        ?.map((name) => formatObjectName(name))
        ?.join(', ')} ${t?.('from')} ${formatDate(photo?.date, 'DD.MM.YYYY')}`
