import { act, renderHook, waitFor } from '@testing-library/react'

import { loadTimezonePolygons, resolveTimeZone } from './timezone'
import { getBrowserPosition, shouldResolveTimeZone, useStarMapLocation } from './useStarMapLocation'

jest.mock('./timezone', () => ({
    loadTimezonePolygons: jest.fn(),
    resolveTimeZone: jest.fn()
}))

const loadTimezonePolygonsMock = loadTimezonePolygons as jest.MockedFunction<typeof loadTimezonePolygons>
const resolveTimeZoneMock = resolveTimeZone as jest.MockedFunction<typeof resolveTimeZone>

const POLYGONS = [{ zoneName: 'Asia/Yekaterinburg', utcOffset: 5, rings: [] }]
const ZONE = { zoneName: 'Asia/Yekaterinburg', utcOffset: 5 }
const GEOPOS: [number, number] = [51.82, 55.17]

type GeolocationSuccess = (position: { coords: { latitude: number; longitude: number } }) => void
type GeolocationError = () => void

describe('star-map geolocation fallback', () => {
    const originalGeolocation = navigator.geolocation

    afterEach(() => {
        Object.defineProperty(navigator, 'geolocation', { value: originalGeolocation, configurable: true })
    })

    it('resolves rounded coordinates on grant', async () => {
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: {
                getCurrentPosition: (success: GeolocationSuccess) =>
                    success({ coords: { latitude: 55.755826123, longitude: 37.617299456 } })
            }
        })

        await expect(getBrowserPosition()).resolves.toStrictEqual([55.7558, 37.6173])
    })

    it('resolves null on denial', async () => {
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: {
                getCurrentPosition: (_success: GeolocationSuccess, error: GeolocationError) => error()
            }
        })

        await expect(getBrowserPosition()).resolves.toBeNull()
    })

    it('resolves null when geolocation is unsupported', async () => {
        Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true })

        await expect(getBrowserPosition()).resolves.toBeNull()
    })
})

describe('shouldResolveTimeZone', () => {
    it('is false on a bare visit: no date, controls never touched', () => {
        expect(shouldResolveTimeZone({ date: null, wanted: false, resolvedFor: null, geoposKey: 'a' })).toBe(false)
    })

    it('is true as soon as a date is selected and nothing is cached', () => {
        expect(shouldResolveTimeZone({ date: new Date(), wanted: false, resolvedFor: null, geoposKey: 'a' })).toBe(true)
    })

    it('is true when the user touched the controls and the place changed', () => {
        expect(shouldResolveTimeZone({ date: null, wanted: true, resolvedFor: 'a', geoposKey: 'b' })).toBe(true)
    })

    it('is false when the cached zone already belongs to the current place', () => {
        expect(shouldResolveTimeZone({ date: new Date(), wanted: true, resolvedFor: 'a', geoposKey: 'a' })).toBe(false)
    })
})

describe('useStarMapLocation timezone resolution', () => {
    beforeEach(() => {
        loadTimezonePolygonsMock.mockReset()
        resolveTimeZoneMock.mockReset()
        loadTimezonePolygonsMock.mockResolvedValue(POLYGONS)
        resolveTimeZoneMock.mockReturnValue(ZONE)
    })

    it('never fetches the polygons on a bare visit without a date', async () => {
        const { result } = renderHook(() => useStarMapLocation(GEOPOS))

        // Let any pending effects settle
        await act(async () => {
            await Promise.resolve()
        })

        expect(loadTimezonePolygonsMock).not.toHaveBeenCalled()
        expect(result.current.timeZone).toBeNull()
        expect(result.current.timeZonePending).toBe(false)
    })

    it('resolves the zone right away for a permalink date and reports pending meanwhile', async () => {
        const { result } = renderHook(() =>
            useStarMapLocation(GEOPOS, { initialDate: new Date('2026-09-01T18:00:00Z') })
        )

        // Pending from the very first render — the control must not show a UTC value first
        expect(result.current.timeZonePending).toBe(true)

        await waitFor(() => expect(result.current.timeZone).toStrictEqual(ZONE))

        expect(loadTimezonePolygonsMock).toHaveBeenCalledTimes(1)
        expect(resolveTimeZoneMock).toHaveBeenCalledWith(GEOPOS[0], GEOPOS[1], POLYGONS)
        expect(result.current.timeZonePending).toBe(false)
    })

    it('resolves the zone when a date is picked later via setDate', async () => {
        const { result } = renderHook(() => useStarMapLocation(GEOPOS))

        expect(loadTimezonePolygonsMock).not.toHaveBeenCalled()

        act(() => {
            result.current.setDate(new Date('2026-09-01T18:00:00Z'))
        })

        // Flipped synchronously with the date, not one effect tick later
        expect(result.current.timeZonePending).toBe(true)

        await waitFor(() => expect(result.current.timeZone).toStrictEqual(ZONE))

        expect(loadTimezonePolygonsMock).toHaveBeenCalledTimes(1)
        expect(result.current.timeZonePending).toBe(false)
    })

    it('resolves on demand via ensureTimeZone and caches the result for the same place', async () => {
        const { result } = renderHook(() => useStarMapLocation(GEOPOS))

        await act(async () => {
            await expect(result.current.ensureTimeZone()).resolves.toStrictEqual(ZONE)
        })

        await act(async () => {
            await expect(result.current.ensureTimeZone()).resolves.toStrictEqual(ZONE)
        })

        expect(loadTimezonePolygonsMock).toHaveBeenCalledTimes(1)
        expect(resolveTimeZoneMock).toHaveBeenCalledTimes(1)
    })

    it('re-resolves for a new place once the time controls have been touched', async () => {
        let geopos: [number, number] = GEOPOS
        const { result, rerender } = renderHook(() => useStarMapLocation(geopos))

        await act(async () => {
            await result.current.ensureTimeZone()
        })

        const moscow = { zoneName: 'Europe/Moscow', utcOffset: 3 }
        resolveTimeZoneMock.mockReturnValue(moscow)

        geopos = [55.75, 37.62]
        rerender()

        await waitFor(() => expect(result.current.timeZone).toStrictEqual(moscow))

        expect(resolveTimeZoneMock).toHaveBeenLastCalledWith(55.75, 37.62, POLYGONS)
    })

    it('clears pending and leaves the zone empty when the polygons are unavailable', async () => {
        loadTimezonePolygonsMock.mockResolvedValue([])

        const { result } = renderHook(() =>
            useStarMapLocation(GEOPOS, { initialDate: new Date('2026-09-01T18:00:00Z') })
        )

        await waitFor(() => expect(result.current.timeZonePending).toBe(false))

        expect(result.current.timeZone).toBeNull()
    })
})
