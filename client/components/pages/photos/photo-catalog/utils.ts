import { ApiModel } from '@/api'
import { createMediumPhotoUrl } from '@/utils/photos'
import { formatObjectName } from '@/utils/strings'

import { GalleryFilters, GalleryPhotoItem } from './types'

/** Trims an API photo to what a tile shows; empty fields are left out for Next's serializer */
export const toGalleryPhoto = (photo: ApiModel.Photo, objectTitles: Record<string, string>): GalleryPhotoItem => {
    const item: GalleryPhotoItem = {
        id: photo.id,
        date: photo.date?.slice(0, 10),
        objects: photo.objects ?? [],
        titles: (photo.objects ?? []).map((name) => objectTitles[name] ?? formatObjectName(name)),
        categories: photo.categories ?? [],
        exposure: photo.statistic?.exposure ?? 0,
        frames: photo.statistic?.frames ?? 0,
        views: Number(photo.views) || 0,
        filters: photo.filters
            ? Object.fromEntries(Object.entries(photo.filters).map(([filter, { exposure }]) => [filter, { exposure }]))
            : undefined,
        src: createMediumPhotoUrl(photo)
    }

    return Object.fromEntries(Object.entries(item).filter(([, value]) => value != null)) as unknown as GalleryPhotoItem
}

/** Matches the catalog name ("M31", "m 31", "NGC7000") or the object's title */
export const matchesPhotoSearch = (photo: GalleryPhotoItem, search: string): boolean => {
    const query = search.trim().toLowerCase()

    if (!query) {
        return true
    }

    const compact = query.replace(/\s+/g, '')

    return (
        photo.objects.some(
            (name) =>
                formatObjectName(name).toLowerCase().includes(query) ||
                name
                    .toLowerCase()
                    .replace(/[_\s-]/g, '')
                    .includes(compact)
        ) || photo.titles.some((title) => title.toLowerCase().includes(query))
    )
}

/** Filters and sorts the gallery; the newest first by default */
export const filterGallery = (photos: GalleryPhotoItem[], filters: GalleryFilters): GalleryPhotoItem[] => {
    const value = (photo: GalleryPhotoItem): number | string => {
        switch (filters.sort) {
            case 'exposure':
                return photo.exposure
            case 'views':
                return photo.views
            case 'date':
            default:
                return photo.date ?? ''
        }
    }

    return photos
        .filter(
            (photo) =>
                (!filters.category || photo.categories.includes(filters.category)) &&
                matchesPhotoSearch(photo, filters.search)
        )
        .sort((a, b) => {
            const x = value(a)
            const y = value(b)
            const result = typeof x === 'string' && typeof y === 'string' ? y.localeCompare(x) : Number(y) - Number(x)

            // Ties fall back to the date, then the id, so the order never jumps between renders
            return result || (b.date ?? '').localeCompare(a.date ?? '') || a.id.localeCompare(b.id)
        })
}
