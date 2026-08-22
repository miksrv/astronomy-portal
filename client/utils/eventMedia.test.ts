import { ApiModel } from '@/api'
import { hosts } from '@/api/constants'

import { createFullMediaUrl, createPreviewMediaUrl } from './eventMedia'

const photo: ApiModel.EventMedia = {
    eventId: 'evt123',
    ext: 'jpg',
    height: 1200,
    mediaType: 'photo',
    name: 'photo-abc',
    width: 1600
}

const video: ApiModel.EventMedia = {
    duration: 42,
    eventId: 'evt123',
    ext: 'mp4',
    height: 1080,
    mediaType: 'video',
    name: 'video-abc',
    width: 1920
}

describe('eventMedia', () => {
    describe('createFullMediaUrl', () => {
        it('builds the full-size URL for a photo using its own extension', () => {
            expect(createFullMediaUrl(photo)).toBe(`${hosts.stargazing}evt123/photo-abc.jpg`)
        })

        it('builds the full-size URL for a video using its own extension (not .jpg)', () => {
            expect(createFullMediaUrl(video)).toBe(`${hosts.stargazing}evt123/video-abc.mp4`)
        })

        it('returns an empty string when the name is missing', () => {
            expect(createFullMediaUrl({ ...photo, name: '' })).toBe('')
        })

        it('returns an empty string when the ext is missing', () => {
            expect(createFullMediaUrl({ ...photo, ext: '' })).toBe('')
        })

        it('returns an empty string when the eventId is missing', () => {
            expect(createFullMediaUrl({ ...photo, eventId: '' })).toBe('')
        })

        it('returns an empty string when media is undefined', () => {
            expect(createFullMediaUrl(undefined)).toBe('')
        })
    })

    describe('createPreviewMediaUrl', () => {
        it('builds the _preview URL for a photo using its own extension', () => {
            expect(createPreviewMediaUrl(photo)).toBe(`${hosts.stargazing}evt123/photo-abc_preview.jpg`)
        })

        it('builds the _preview URL for a video, always as .jpg regardless of the video container format', () => {
            expect(createPreviewMediaUrl(video)).toBe(`${hosts.stargazing}evt123/video-abc_preview.jpg`)
        })

        it('builds the _preview URL for a webm video, still as .jpg', () => {
            expect(createPreviewMediaUrl({ ...video, ext: 'webm' })).toBe(
                `${hosts.stargazing}evt123/video-abc_preview.jpg`
            )
        })

        it('returns an empty string when required fields are missing', () => {
            expect(createPreviewMediaUrl({ ...video, name: '' })).toBe('')
        })

        it('returns an empty string when media is undefined', () => {
            expect(createPreviewMediaUrl(undefined)).toBe('')
        })
    })
})
