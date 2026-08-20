import { ApiModel } from '@/api'
import { createSmallPhotoUrl } from '@/utils/photos'

export type FlattenedObject = {
    name: string
    title: string
    photo?: string
    photoId?: string
    categories?: ApiModel.Category[]
    updated?: string
    frames?: number
    exposure?: number
    lFilterExposure?: number
    rFilterExposure?: number
    gFilterExposure?: number
    bFilterExposure?: number
    hFilterExposure?: number
    oFilterExposure?: number
    sFilterExposure?: number
}

export const flattenObjects = (objectsList?: ApiModel.Object[], photosList?: ApiModel.Photo[]): FlattenedObject[] =>
    objectsList?.map((obj) => {
        const photos = photosList
            ?.filter((photo) => photo.objects?.includes(obj.name))
            ?.sort((a, b) => (a.date && b.date ? new Date(b?.date).getTime() - new Date(a?.date).getTime() : 0))

        return {
            name: obj.name,
            title: obj.title,
            photo: createSmallPhotoUrl(photos?.[0]),
            photoId: photos?.[0]?.id,
            categories: obj.categories,
            updated: obj.updated?.date,
            frames: obj.statistic?.frames || 0,
            exposure: obj.statistic?.exposure || 0,
            lFilterExposure: obj.filters?.L?.exposure || 0,
            rFilterExposure: obj.filters?.R?.exposure || 0,
            gFilterExposure: obj.filters?.G?.exposure || 0,
            bFilterExposure: obj.filters?.B?.exposure || 0,
            hFilterExposure: obj.filters?.H?.exposure || 0,
            oFilterExposure: obj.filters?.O?.exposure || 0,
            sFilterExposure: obj.filters?.S?.exposure || 0
        } as FlattenedObject
    }) || []
