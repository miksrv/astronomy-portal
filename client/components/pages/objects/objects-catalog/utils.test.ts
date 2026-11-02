import { getObjectStatus } from '@/utils/objects'

import { DEFAULT_FILTERS } from './constants'
import { CatalogObject } from './types'
import { filterCatalog, matchesSearch, toCatalogObject } from './utils'

const object = (name: string, overrides: Partial<CatalogObject> = {}): CatalogObject => ({
    name,
    title: name,
    categories: [],
    exposure: 0,
    frames: 0,
    nights: 0,
    photosCount: 0,
    ...overrides
})

const m101 = object('M_101', {
    title: 'Галактика Вертушка',
    categories: [1],
    exposure: 500,
    frames: 10,
    photosCount: 2
})
const m13 = object('M_13', { title: 'Шаровое скопление', categories: [5], exposure: 1500, frames: 30, nights: 4 })
const ngc7000 = object('NGC_7000', { title: 'Туманность Северная Америка', categories: [2], lastNight: '2023-10-19' })
const sn2023ixf = object('2023ixf', { title: 'Сверхновая', categories: [6, 1] })

const catalog = [m101, m13, ngc7000, sn2023ixf]

describe('objects catalog utils', () => {
    it('derives the status from photos and frames', () => {
        expect(getObjectStatus(m101)).toBe('photo')
        expect(getObjectStatus(m13)).toBe('frames')
        expect(getObjectStatus(sn2023ixf)).toBe('none')
    })

    it('trims an API object, keeping only the exposure per filter', () => {
        const trimmed = toCatalogObject({
            name: 'IC_1396',
            title: 'Хобот слона',
            statistic: { frames: 231, exposure: 69300, fileSize: 0 },
            filters: { H: { frames: 66, exposure: 19800, fileSize: 0 } },
            cover: { id: '1', dirName: 'IC1396', fileName: 'IC1396-1', fileExt: 'jpeg' },
            photosCount: 3,
            nights: 9
        })

        expect(trimmed.filters).toEqual({ H: { exposure: 19800 } })
        expect(trimmed.cover).toMatch(/IC1396\/IC1396-1_thumb\.jpeg$/)
        expect(trimmed).toMatchObject({ frames: 231, exposure: 69300, nights: 9, photosCount: 3, categories: [] })
    })

    it('searches by catalog name with or without spaces, and by title', () => {
        expect(matchesSearch(m101, 'm 101')).toBe(true)
        expect(matchesSearch(ngc7000, 'ngc7000')).toBe(true)
        expect(matchesSearch(ngc7000, 'америка')).toBe(true)
        expect(matchesSearch(ngc7000, 'M 101')).toBe(false)
    })

    it('sorts names naturally', () => {
        const names = filterCatalog(catalog, DEFAULT_FILTERS).map(({ name }) => name)
        expect(names).toEqual(['2023ixf', 'M_13', 'M_101', 'NGC_7000'])
    })

    it('filters by category and status', () => {
        expect(filterCatalog(catalog, { ...DEFAULT_FILTERS, category: 1 }).map(({ name }) => name)).toEqual([
            '2023ixf',
            'M_101'
        ])
        expect(filterCatalog(catalog, { ...DEFAULT_FILTERS, status: 'frames' }).map(({ name }) => name)).toEqual([
            'M_13'
        ])
    })

    it('sorts numbers biggest first', () => {
        const names = filterCatalog(catalog, { ...DEFAULT_FILTERS, sort: 'exposure', direction: 'desc' })
        expect(names.map(({ name }) => name).slice(0, 2)).toEqual(['M_13', 'M_101'])
    })

    it('keeps only objects high enough tonight once the visibility is known', () => {
        const filters = { ...DEFAULT_FILTERS, visibleOnly: true }

        expect(filterCatalog(catalog, filters)).toHaveLength(4)
        expect(
            filterCatalog(catalog, filters, {
                M_13: { altitude: 60, level: 'high' },
                M_101: { altitude: 20, level: 'none' }
            }).map(({ name }) => name)
        ).toEqual(['M_13'])
    })
})
