import { createSkySurveyUrl } from './skySurvey'

describe('createSkySurveyUrl', () => {
    const params = (url: string) => new URL(url).searchParams

    it('cuts out the field of the camera around the object', () => {
        // 0.99″/px at 2328×1760: 38′ × 29′
        const url = createSkySurveyUrl(63.8152, -7.65522, { width: 2328, height: 1760, scale: 0.9923291 })

        expect(new URL(url).hostname).toBe('skyview.gsfc.nasa.gov')
        expect(params(url).get('Position')).toBe('63.8152,-7.65522')
        expect(params(url).get('Survey')).toBe('DSS2 Red')
        expect(params(url).get('Size')).toBe('0.6417,0.4851')
        expect(params(url).get('Pixels')).toBe('1000,756')
    })

    it('falls back to a default field and keeps it within sane bounds', () => {
        expect(params(createSkySurveyUrl(10, 20)).get('Size')).toBe('0.6000,0.4500')
        expect(params(createSkySurveyUrl(10, 20, { width: 100, height: 100, scale: 600 })).get('Size')).toBe(
            '3.0000,3.0000'
        )
    })
})
