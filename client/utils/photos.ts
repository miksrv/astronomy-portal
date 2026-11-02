import type React from 'react'
import { TFunction } from 'i18next'

import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'
import { formatDate } from '@/utils/dates'
import { formatObjectName } from '@/utils/strings'

/**
 * Splits photos with multiple objects into one-object-per-entry records,
 * then deduplicates by object key keeping the most recent photo per object.
 */
export const normalizeAndFilterObjects = (data?: ApiModel.Photo[]): ApiModel.Photo[] => {
    const splitData = data?.flatMap((item) =>
        item?.objects?.map((obj) => ({
            ...item,
            objects: [obj]
        }))
    )

    const uniqueMap = splitData?.reduce<Record<string, ApiModel.Photo>>((acc, item) => {
        if (!item) {
            return acc
        }

        const key = item.objects?.[0] as string

        if (acc[key]) {
            const existingDate = new Date(acc[key]?.date ?? '')
            const currentDate = new Date(item.date ?? '')

            if (currentDate > existingDate) {
                acc[key] = item
            }
        } else {
            acc[key] = item
        }

        return acc
    }, {})

    return Object.values(uniqueMap ?? {})
}

const createPhotoUrl = (photo?: ApiModel.Photo, size?: 'small' | 'thumb' | 'medium' | 'large'): string => {
    if (!photo?.fileName || !photo?.fileExt || !photo?.dirName) {
        return ''
    }

    return `${hosts.photo}${photo.dirName}/${photo.fileName}_${size}.${photo?.fileExt}`
}

export const createSmallPhotoUrl = (photo?: ApiModel.Photo): string => createPhotoUrl(photo, 'small')

/**
 * Falls back from the square `_thumb` to the `_medium` file: photos uploaded before 4.15.0 have
 * no thumb until `php spark photos:thumbnails` has run on the host. For `onError` of an <img>.
 */
export const fallbackToMediumPhoto = (event: React.SyntheticEvent<HTMLImageElement>): void => {
    const image = event.currentTarget

    if (image.src.includes('_thumb.')) {
        image.src = image.src.replace('_thumb.', '_medium.')
    }
}

/** The square 160 px thumbnail (`_thumb`), for the objects catalog and small cards */
export const createThumbPhotoUrl = (photo?: ApiModel.Photo): string => createPhotoUrl(photo, 'thumb')

export const createMediumPhotoUrl = (photo?: ApiModel.Photo): string => createPhotoUrl(photo, 'medium')

export const createLargePhotoUrl = (photo?: ApiModel.Photo): string => createPhotoUrl(photo, 'large')

export const createPhotoTitle = (photo?: ApiModel.Photo, t?: TFunction) =>
    `${t?.('common.photo', 'Фото')} ${photo?.objects
        ?.map((name) => formatObjectName(name))
        ?.join(', ')} ${t?.('common.from', 'от')} ${formatDate(photo?.date, 'DD.MM.YYYY')}`
