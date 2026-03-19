import { ApiModel } from '@/api'

import { createPhotoTitle, createSmallPhotoUrl } from './photos'

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
})
