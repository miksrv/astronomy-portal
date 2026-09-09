import { DEFAULT_STARMAP_SETTINGS } from './constants'
import {
    isQuickBarActive,
    isQuickBarEnabled,
    QUICK_BAR_ATMOSPHERE_KEY,
    QUICK_BAR_SETTING_KEYS,
    QUICK_BAR_TOGGLE_KEYS,
    QUICK_BAR_VIEW_MODE_KEY,
    toggleQuickBarSetting
} from './quickBar'
import { StarMapSettings } from './types'

describe('star-map quick bar', () => {
    const base: StarMapSettings = { ...DEFAULT_STARMAP_SETTINGS }

    it('maps every layer toggle to a boolean setting', () => {
        for (const key of QUICK_BAR_TOGGLE_KEYS) {
            expect(typeof base[QUICK_BAR_SETTING_KEYS[key]]).toBe('boolean')
        }
    })

    it('reports the active state from the mapped setting', () => {
        expect(isQuickBarActive({ ...base, constellationLines: true }, 'constellation-lines')).toBe(true)
        expect(isQuickBarActive({ ...base, constellationLines: false }, 'constellation-lines')).toBe(false)
        expect(isQuickBarActive({ ...base, dsosShow: false }, 'dsos')).toBe(false)
    })

    it('flips a layer toggle without touching other settings or mutating the input', () => {
        const input: StarMapSettings = { ...base, graticule: true, milkyWay: true }
        const next = toggleQuickBarSetting(input, 'graticule')

        expect(next.graticule).toBe(false)
        expect(next.milkyWay).toBe(true)
        expect(next.viewMode).toBe(input.viewMode)
        expect(input.graticule).toBe(true)
        expect(next).not.toBe(input)
    })

    it('flips back on a second toggle', () => {
        const once = toggleQuickBarSetting(base, 'meteor-showers')
        const twice = toggleQuickBarSetting(once, 'meteor-showers')

        expect(once.meteorShowersShow).toBe(!base.meteorShowersShow)
        expect(twice.meteorShowersShow).toBe(base.meteorShowersShow)
    })

    it('switches the view mode between sky and horizon', () => {
        const horizon = toggleQuickBarSetting({ ...base, viewMode: 'sky' }, QUICK_BAR_VIEW_MODE_KEY)
        const sky = toggleQuickBarSetting(horizon, QUICK_BAR_VIEW_MODE_KEY)

        expect(horizon.viewMode).toBe('horizon')
        expect(isQuickBarActive(horizon, QUICK_BAR_VIEW_MODE_KEY)).toBe(true)
        expect(sky.viewMode).toBe('sky')
        expect(isQuickBarActive(sky, QUICK_BAR_VIEW_MODE_KEY)).toBe(false)
    })

    it('offers the atmosphere switch only in horizon mode', () => {
        expect(isQuickBarEnabled({ ...base, viewMode: 'sky' }, QUICK_BAR_ATMOSPHERE_KEY)).toBe(false)
        expect(isQuickBarEnabled({ ...base, viewMode: 'horizon' }, QUICK_BAR_ATMOSPHERE_KEY)).toBe(true)
        expect(isQuickBarEnabled({ ...base, viewMode: 'sky' }, 'graticule')).toBe(true)
    })

    it('reads the atmosphere as off in sky mode even when the setting is on', () => {
        expect(isQuickBarActive({ ...base, viewMode: 'sky', atmosphere: true }, QUICK_BAR_ATMOSPHERE_KEY)).toBe(false)
        expect(isQuickBarActive({ ...base, viewMode: 'horizon', atmosphere: true }, QUICK_BAR_ATMOSPHERE_KEY)).toBe(
            true
        )
        expect(isQuickBarActive({ ...base, viewMode: 'horizon', atmosphere: false }, QUICK_BAR_ATMOSPHERE_KEY)).toBe(
            false
        )
    })

    it('flips the atmosphere without changing the view mode', () => {
        const next = toggleQuickBarSetting({ ...base, viewMode: 'horizon', atmosphere: true }, QUICK_BAR_ATMOSPHERE_KEY)

        expect(next.atmosphere).toBe(false)
        expect(next.viewMode).toBe('horizon')
    })
})
