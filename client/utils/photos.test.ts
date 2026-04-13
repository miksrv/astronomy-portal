import { ApiModel } from '@/api'

import { createPhotoTitle, createSmallPhotoUrl, normalizeAndFilterObjects } from './photos'

const basePhoto: ApiModel.Photo = {
    dirName: '2024-01',
    fileExt: 'jpg',
    fileName: 'ngc1234',
    id: 'photo-1',
    objects: ['NGC_1234']
}

describe('photos', () => {
    describe('createSmallPhotoUrl', () => {
        it('returns empty string for undefined photo', () => {
            expect(createSmallPhotoUrl(undefined)).toBe('')
        })

        it('returns empty string when fileName is missing', () => {
            expect(createSmallPhotoUrl({ ...basePhoto, fileName: undefined })).toBe('')
        })

        it('returns empty string when fileExt is missing', () => {
            expect(createSmallPhotoUrl({ ...basePhoto, fileExt: undefined })).toBe('')
        })

        it('returns empty string when dirName is missing', () => {
            expect(createSmallPhotoUrl({ ...basePhoto, dirName: undefined })).toBe('')
        })

        it('constructs a URL containing dirName, fileName, size and ext', () => {
            const url = createSmallPhotoUrl(basePhoto)
            expect(url).toContain('2024-01')
            expect(url).toContain('ngc1234')
            expect(url).toContain('_small')
            expect(url).toContain('.jpg')
        })

        it('URL ends with the expected path pattern', () => {
            const url = createSmallPhotoUrl(basePhoto)
            expect(url).toMatch(/2024-01\/ngc1234_small\.jpg$/)
        })
    })

    describe('createPhotoTitle', () => {
        it('creates title with object names and date', () => {
            const photo: ApiModel.Photo = {
                ...basePhoto,
                date: '2024-01-15',
                objects: ['NGC_1234', 'IC_5070']
            }
            const result = createPhotoTitle(photo)
            expect(result).toContain('NGC 1234')
            expect(result).toContain('IC 5070')
            expect(result).toContain('15.01.2024')
        })

        it('replaces underscores with spaces in object names', () => {
            const photo: ApiModel.Photo = {
                ...basePhoto,
                date: '2024-06-01',
                objects: ['Horsehead_Nebula']
            }
            const result = createPhotoTitle(photo)
            expect(result).toContain('Horsehead Nebula')
        })

        it('includes the t function label for photo and from', () => {
            // @ts-expect-error: simplified TFunction mock
            const mockT = (key: string, defaultValue: string) => defaultValue
            const photo: ApiModel.Photo = {
                ...basePhoto,
                date: '2024-01-01',
                objects: ['M31']
            }
            const result = createPhotoTitle(photo, mockT)
            expect(result).toContain('Фото')
            expect(result).toContain('от')
        })

        it('handles undefined objects array gracefully', () => {
            const photo: ApiModel.Photo = { ...basePhoto, objects: undefined }
            const result = createPhotoTitle(photo)
            expect(typeof result).toBe('string')
        })
    })

    describe('normalizeAndFilterObjects', () => {
        it('returns empty array for undefined input', () => {
            expect(normalizeAndFilterObjects(undefined)).toStrictEqual([])
        })

        it('returns empty array for empty input', () => {
            expect(normalizeAndFilterObjects([])).toStrictEqual([])
        })

        it('splits a photo with multiple objects into separate entries', () => {
            const photo: ApiModel.Photo = {
                ...basePhoto,
                date: '2024-01-01',
                objects: ['NGC_1234', 'IC_5070']
            }
            const result = normalizeAndFilterObjects([photo])
            expect(result).toHaveLength(2)
            expect(result.some((p) => p.objects?.[0] === 'NGC_1234')).toBe(true)
            expect(result.some((p) => p.objects?.[0] === 'IC_5070')).toBe(true)
        })

        it('deduplicates by object key, keeping the most recent photo', () => {
            const older: ApiModel.Photo = { ...basePhoto, id: 'old', date: '2023-06-01', objects: ['NGC_1234'] }
            const newer: ApiModel.Photo = { ...basePhoto, id: 'new', date: '2024-06-01', objects: ['NGC_1234'] }
            const result = normalizeAndFilterObjects([older, newer])
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('new')
        })

        it('keeps the older photo when dates are same or older arrives second', () => {
            const first: ApiModel.Photo = { ...basePhoto, id: 'first', date: '2024-06-01', objects: ['NGC_1234'] }
            const second: ApiModel.Photo = { ...basePhoto, id: 'second', date: '2023-01-01', objects: ['NGC_1234'] }
            const result = normalizeAndFilterObjects([first, second])
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('first')
        })

        it('handles photos without objects gracefully', () => {
            const photo: ApiModel.Photo = { ...basePhoto, objects: undefined }
            const result = normalizeAndFilterObjects([photo])
            expect(Array.isArray(result)).toBe(true)
        })
    })
})
