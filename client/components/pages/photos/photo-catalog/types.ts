import { ApiModel } from '@/api'
import { SearchCategoryFilters } from '@/hooks/useSearchCategoryFilters'

/** What a gallery tile needs of a photo: shaped in getServerSideProps to keep the page data small */
export interface GalleryPhotoItem {
    id: string
    /** `YYYY-MM-DD` */
    date?: string
    objects: string[]
    /** Titles of the objects, for the tile's name and the search */
    titles: string[]
    categories: number[]
    exposure: number
    frames: number
    views: number
    /** Exposure per filter only, the shape FilterSpectrum takes */
    filters?: ApiModel.Filters
    /** Medium-size image URL */
    src: string
}

export type GallerySort = 'date' | 'exposure' | 'views'

export interface GalleryFilters extends SearchCategoryFilters {
    sort: GallerySort
}
