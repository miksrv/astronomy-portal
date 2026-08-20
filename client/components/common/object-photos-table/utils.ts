import { ApiModel } from '@/api'
import { createSmallPhotoUrl } from '@/utils/photos'

export type FlattenedPhoto = {
    id?: string
    photo?: string
    objects?: string[]
    date?: string
    frames?: number
    exposure?: number
    lFilterExposure?: number
    rFilterExposure?: number
    gFilterExposure?: number
    bFilterExposure?: number
    hFilterExposure?: number
    oFilterExposure?: number
    sFilterExposure?: number
    nFilterExposure?: number
}

export const flattenPhotos = (photosList?: ApiModel.Photo[]): FlattenedPhoto[] =>
    photosList?.map(
        (photo) =>
            ({
                id: photo.id,
                photo: createSmallPhotoUrl(photo),
                objects: photo.objects,
                date: photo.date,
                frames: photo.statistic?.frames || 0,
                exposure: photo.statistic?.exposure || 0,
                lFilterExposure: photo.filters?.L?.exposure || 0,
                rFilterExposure: photo.filters?.R?.exposure || 0,
                gFilterExposure: photo.filters?.G?.exposure || 0,
                bFilterExposure: photo.filters?.B?.exposure || 0,
                hFilterExposure: photo.filters?.H?.exposure || 0,
                oFilterExposure: photo.filters?.O?.exposure || 0,
                sFilterExposure: photo.filters?.S?.exposure || 0,
                nFilterExposure: photo.filters?.N?.exposure || 0
            }) as FlattenedPhoto
    ) || []
