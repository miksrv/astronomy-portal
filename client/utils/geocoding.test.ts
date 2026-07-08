import { reverseGeocode } from './geocoding'

describe('reverseGeocode', () => {
    afterEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (global as any).fetch
    })

    it('returns the display_name from a successful response', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ display_name: 'Оренбургский район, Оренбургская область' })
        }) as jest.Mock

        const result = await reverseGeocode(51.8250225, 55.71072)

        expect(result).toBe('Оренбургский район, Оренбургская область')
    })

    it('returns undefined when the request fails', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock

        const result = await reverseGeocode(51.8250225, 55.71072)

        expect(result).toBeUndefined()
    })

    it('returns undefined when display_name is missing', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({})
        }) as jest.Mock

        const result = await reverseGeocode(51.8250225, 55.71072)

        expect(result).toBeUndefined()
    })
})
