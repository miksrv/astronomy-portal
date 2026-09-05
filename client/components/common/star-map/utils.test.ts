import {
    DEFAULT_STARMAP_SETTINGS,
    POINT_RADIUS,
    POPUP_ARROW_MARGIN,
    POPUP_ARROW_SIZE,
    POPUP_HEIGHT,
    POPUP_OFFSET,
    POPUP_WIDTH
} from './constants'
import { StarMapSettings } from './types'
import {
    buildLiveSettingsPatch,
    buildSkyviewPatch,
    buildVisualConfig,
    clampPopupPosition,
    computeHorizonCanvasLayout,
    getPopupArrowTop
} from './utils'

const makeSettings = (overrides: Partial<StarMapSettings> = {}): StarMapSettings => ({
    ...DEFAULT_STARMAP_SETTINGS,
    ...overrides
})

describe('star-map utils', () => {
    describe('computeHorizonCanvasLayout', () => {
        it('landscape: dome diameter = height, padding fills the remaining width', () => {
            expect(computeHorizonCanvasLayout(1160, 699)).toStrictEqual({ width: 699, backgroundWidth: 461 })
        })

        it('portrait: dome diameter = width, padding fills the remaining height', () => {
            expect(computeHorizonCanvasLayout(390, 700)).toStrictEqual({ width: 390, backgroundWidth: 310 })
        })

        it('square container needs no padding', () => {
            expect(computeHorizonCanvasLayout(700, 700)).toStrictEqual({ width: 700, backgroundWidth: 0 })
        })

        it('never produces a zero or negative projection width', () => {
            expect(computeHorizonCanvasLayout(0, 0).width).toBe(1)
            expect(computeHorizonCanvasLayout(0, 0).backgroundWidth).toBe(0)
        })
    })

    describe('buildVisualConfig — horizon background padding', () => {
        it('horizon mode makes the outline stroke transparent and starts with zero padding', () => {
            const config = buildVisualConfig(makeSettings({ viewMode: 'horizon' }))

            expect(config.background.width).toBe(0)
            expect(config.background.stroke).toBe('rgba(0, 0, 0, 0)')
        })

        it('sky mode keeps the default background outline', () => {
            const config = buildVisualConfig(makeSettings({ viewMode: 'sky' }))

            expect(config.background.width).toBe(1.5)
            expect(config.background.stroke).toBe('#000000')
        })
    })

    describe('buildVisualConfig — view modes (FE-3)', () => {
        it('keeps the flat equatorial chart for the default sky mode', () => {
            const config = buildVisualConfig(makeSettings())

            expect(config.projection).toBe('mercator')
            expect(config.horizon.show).toBe(false)
            expect(config.daylight.show).toBe(false)
            expect(config.follow).not.toBe('zenith')
        })

        it('builds the horizon-mode config: azimuthal projection, own centering, horizon + daylight', () => {
            const config = buildVisualConfig(makeSettings({ viewMode: 'horizon', geopos: [55, 37] }))

            expect(config.projection).toBe('airy')
            // Not 'zenith': the mode points itself so the visitor's direction survives a
            // date change — a zenith follow would re-center on every skyview()
            expect(config.follow).toBe('center')
            expect(config.geopos).toStrictEqual([55, 37])
            expect(config.horizon.show).toBe(true)
            expect(config.daylight.show).toBe(true)
        })

        it('runs horizon mode without Celestial transitions — it drives rotation/zoom per frame', () => {
            expect(buildVisualConfig(makeSettings({ viewMode: 'horizon' })).disableAnimations).toBe(true)
            expect(buildVisualConfig(makeSettings({ viewMode: 'sky' })).disableAnimations).toBeUndefined()
        })

        it('always enables location so the hidden form (and skyview API) exists', () => {
            expect(buildVisualConfig(makeSettings()).location).toBe(true)
            expect(buildVisualConfig(makeSettings({ viewMode: 'horizon' })).location).toBe(true)
        })

        it('swaps the DSO catalog when the full-catalog toggle is on (FE-5)', () => {
            expect(buildVisualConfig(makeSettings()).dsos.data).toBe('dsos.bright.json')
            expect(buildVisualConfig(makeSettings({ dsosFull: true })).dsos.data).toBe('dsos.6.json')
        })

        it('turns the daylight gradient off with the atmosphere switch (horizon mode only)', () => {
            expect(buildVisualConfig(makeSettings({ viewMode: 'horizon', atmosphere: false })).daylight.show).toBe(
                false
            )
            // The flat chart never has a daylight pass, whatever the switch says
            expect(buildVisualConfig(makeSettings({ viewMode: 'sky', atmosphere: true })).daylight.show).toBe(false)
        })

        it('disables the bundled third-party timezone lookup in both modes', () => {
            expect(buildVisualConfig(makeSettings()).settimezone).toBe(false)
            expect(buildVisualConfig(makeSettings({ viewMode: 'horizon' })).settimezone).toBe(false)
        })
    })

    describe('buildSkyviewPatch', () => {
        it('pins the timezone to the browser offset of the given instant, in minutes', () => {
            const date = new Date('2026-09-01T18:00:00Z')

            expect(buildSkyviewPatch(date)).toStrictEqual({ date, timezone: -date.getTimezoneOffset() })
        })

        it('includes the location only when one is given', () => {
            const date = new Date('2026-01-15T12:00:00Z')

            expect(buildSkyviewPatch(date, [51.82, 55.17]).location).toStrictEqual([51.82, 55.17])
            expect('location' in buildSkyviewPatch(date)).toBe(false)
        })

        it('uses the offset of the target instant, not of today (DST-safe)', () => {
            const winter = new Date('2026-01-15T12:00:00Z')
            const summer = new Date('2026-07-15T12:00:00Z')

            expect(buildSkyviewPatch(winter).timezone).toBe(-winter.getTimezoneOffset())
            expect(buildSkyviewPatch(summer).timezone).toBe(-summer.getTimezoneOffset())
        })
    })

    describe('buildLiveSettingsPatch', () => {
        it('never contains rebuild-only fields (projection/follow/dsos.data)', () => {
            const patch = buildLiveSettingsPatch(makeSettings({ viewMode: 'horizon', dsosFull: true }))

            expect(patch).not.toHaveProperty('projection')
            expect(patch).not.toHaveProperty('follow')
            expect(patch.dsos).not.toHaveProperty('data')
        })

        it('live-patches the atmosphere in horizon mode and keeps daylight off in sky mode', () => {
            expect(buildLiveSettingsPatch(makeSettings({ viewMode: 'horizon', atmosphere: true })).daylight.show).toBe(
                true
            )
            expect(buildLiveSettingsPatch(makeSettings({ viewMode: 'horizon', atmosphere: false })).daylight.show).toBe(
                false
            )
            expect(buildLiveSettingsPatch(makeSettings({ viewMode: 'sky', atmosphere: true })).daylight.show).toBe(
                false
            )
        })
    })

    describe('clampPopupPosition', () => {
        const gap = POINT_RADIUS + POPUP_OFFSET + POPUP_ARROW_SIZE

        it('keeps the popup inside the container horizontally', () => {
            const position = clampPopupPosition(0, 100, 800, 600)

            expect(position.x).toBeGreaterThanOrEqual(0)
        })

        it('centers under the marker using the default photo-popup size', () => {
            const position = clampPopupPosition(400, 100, 800, 600)

            expect(position.placement).toBe('below')
            expect(position.x).toBe(400 - POPUP_WIDTH / 2)
            expect(position.y).toBe(100 + gap)
            expect(position.arrowOffset).toBe(POPUP_WIDTH / 2)
        })

        it('centers a wider (info) popup by its own width, keeping the arrow on the marker', () => {
            const position = clampPopupPosition(400, 100, 800, 600, 230, 260)

            expect(position.x).toBe(400 - 115)
            expect(position.arrowOffset).toBe(115)
        })

        it('flips a tall popup above the marker when it does not fit below', () => {
            // Default height would still fit below; the measured 300px one does not
            expect(clampPopupPosition(400, 380, 800, 600).placement).toBe('below')

            const position = clampPopupPosition(400, 380, 800, 600, 230, 300)

            expect(position.placement).toBe('above')
            expect(position.y).toBe(380 - gap - 300)
        })

        it('stays below and clamps to the bottom edge when it fits neither side', () => {
            const position = clampPopupPosition(400, 300, 800, 400, 230, 300)

            expect(position.placement).toBe('below')
            expect(position.y).toBe(400 - 300)
        })

        it('clamps to the right edge and shifts the arrow towards the marker', () => {
            const position = clampPopupPosition(790, 100, 800, 600, 230, 200)

            expect(position.x).toBe(800 - 230)
            // Marker is 220px into the popup, but the arrow is kept off the rounded corner
            expect(position.arrowOffset).toBe(230 - POPUP_ARROW_MARGIN)
        })

        it('clamps to the left edge with the arrow at its minimum margin', () => {
            const position = clampPopupPosition(5, 100, 800, 600, 230, 200)

            expect(position.x).toBe(0)
            expect(position.arrowOffset).toBe(POPUP_ARROW_MARGIN)
        })
    })

    describe('getPopupArrowTop', () => {
        it('sits flush with the top edge when the popup is below the marker', () => {
            expect(getPopupArrowTop(120, 260, 'below')).toBe(120 - POPUP_ARROW_SIZE)
        })

        it('uses the measured height (not the constant) when the popup is above the marker', () => {
            expect(getPopupArrowTop(40, 260, 'above')).toBe(300)
            expect(getPopupArrowTop(40, POPUP_HEIGHT, 'above')).toBe(40 + POPUP_HEIGHT)
        })
    })
})
