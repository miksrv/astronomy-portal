import { DEFAULT_STARMAP_SETTINGS } from './constants'
import { isDefaultGeopos, loadGeoNudgeDismissed, saveGeoNudgeDismissed, shouldShowGeoNudge } from './geoNudge'

describe('star-map geolocation nudge', () => {
    const defaultGeopos = DEFAULT_STARMAP_SETTINGS.geopos

    it('recognises the observatory fallback position, tolerating float noise', () => {
        expect(isDefaultGeopos(defaultGeopos)).toBe(true)
        expect(isDefaultGeopos([defaultGeopos[0] + 1e-9, defaultGeopos[1] - 1e-9])).toBe(true)
        expect(isDefaultGeopos([55.75, 37.62])).toBe(false)
        expect(isDefaultGeopos([defaultGeopos[0], defaultGeopos[1] + 0.01])).toBe(false)
    })

    it('shows the nudge only in horizon mode while the place is still the fallback', () => {
        expect(
            shouldShowGeoNudge({ viewMode: 'horizon', geopos: defaultGeopos, dismissed: false, geolocated: false })
        ).toBe(true)
        expect(
            shouldShowGeoNudge({ viewMode: 'sky', geopos: defaultGeopos, dismissed: false, geolocated: false })
        ).toBe(false)
    })

    it('never shows the nudge once the visitor has picked a place in any way', () => {
        expect(
            shouldShowGeoNudge({ viewMode: 'horizon', geopos: [55.75, 37.62], dismissed: false, geolocated: false })
        ).toBe(false)
    })

    it('never shows the nudge again after it was dismissed or geolocation was attempted', () => {
        expect(
            shouldShowGeoNudge({ viewMode: 'horizon', geopos: defaultGeopos, dismissed: true, geolocated: false })
        ).toBe(false)
        expect(
            shouldShowGeoNudge({ viewMode: 'horizon', geopos: defaultGeopos, dismissed: false, geolocated: true })
        ).toBe(false)
    })

    it('persists the dismissal in localStorage and reads it back', () => {
        localStorage.clear()

        expect(loadGeoNudgeDismissed()).toBe(false)

        saveGeoNudgeDismissed()

        expect(loadGeoNudgeDismissed()).toBe(true)

        localStorage.clear()
    })
})
