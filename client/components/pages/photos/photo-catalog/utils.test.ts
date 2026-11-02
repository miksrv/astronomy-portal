import { GalleryFilters, GalleryPhotoItem } from './types'
import { filterGallery, matchesPhotoSearch, toGalleryPhoto } from './utils'

const photo = (id: string, overrides: Partial<GalleryPhotoItem> = {}): GalleryPhotoItem => ({
    id,
    objects: [],
    titles: [],
    categories: [],
    exposure: 0,
    frames: 0,
    views: 0,
    src: '',
    ...overrides
})

const gallery = [
    photo('a', {
        date: '2021-01-23',
        objects: ['IC_63'],
        titles: ['Туманность Призрак'],
        categories: [2],
        exposure: 40200,
        views: 10
    }),
    photo('b', {
        date: '2026-04-04',
        objects: ['IC_1805'],
        titles: ['Туманность Сердце'],
        categories: [2],
        exposure: 82800,
        views: 500
    }),
    photo('c', {
        date: '2022-05-15',
        objects: ['M_51'],
        titles: ['Галактика Водоворот'],
        categories: [1],
        exposure: 37500,
        views: 120
    })
]

const defaults: GalleryFilters = { search: '', category: undefined, sort: 'date' }

describe('photo gallery utils', () => {
    it('trims an API photo, resolving object titles', () => {
        const trimmed = toGalleryPhoto(
            {
                id: 'x',
                date: '2026-04-04',
                objects: ['IC_1805'],
                categories: [2],
                views: 500,
                statistic: { frames: 145, exposure: 82800, fileSize: 0 },
                filters: { H: { frames: 55, exposure: 28800, fileSize: 0 } },
                dirName: 'IC1805',
                fileName: 'IC1805-04.04.2026',
                fileExt: 'jpg'
            },
            { IC_1805: 'Туманность Сердце (IC 1805)' }
        )

        expect(trimmed.titles).toStrictEqual(['Туманность Сердце (IC 1805)'])
        expect(trimmed.filters).toStrictEqual({ H: { exposure: 28800 } })
        expect(trimmed.src).toMatch(/IC1805\/IC1805-04\.04\.2026_medium\.jpg$/)
        expect(trimmed).not.toHaveProperty('width')
    })

    it('searches by catalog name, compact name and title', () => {
        expect(matchesPhotoSearch(gallery[0]!, 'ic 63')).toBe(true)
        expect(matchesPhotoSearch(gallery[1]!, 'ic1805')).toBe(true)
        expect(matchesPhotoSearch(gallery[2]!, 'водоворот')).toBe(true)
        expect(matchesPhotoSearch(gallery[2]!, 'ic')).toBe(false)
    })

    it('sorts the newest first by default, and by exposure or views on request', () => {
        expect(filterGallery(gallery, defaults).map(({ id }) => id)).toStrictEqual(['b', 'c', 'a'])
        expect(filterGallery(gallery, { ...defaults, sort: 'exposure' }).map(({ id }) => id)).toStrictEqual([
            'b',
            'a',
            'c'
        ])
        expect(filterGallery(gallery, { ...defaults, sort: 'views' }).map(({ id }) => id)).toStrictEqual([
            'b',
            'c',
            'a'
        ])
    })

    it('filters by category and search together', () => {
        expect(
            filterGallery(gallery, { ...defaults, category: 2, search: 'сердце' }).map(({ id }) => id)
        ).toStrictEqual(['b'])
    })
})
