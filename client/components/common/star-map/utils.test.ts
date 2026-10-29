import {
    DEFAULT_STARMAP_SETTINGS,
    HORIZON_FIT_FRACTION,
    INITIAL_HORIZON_ZOOM,
    POINT_RADIUS,
    POPUP_ARROW_MARGIN,
    POPUP_ARROW_SIZE,
    POPUP_HEIGHT,
    POPUP_OFFSET,
    POPUP_WIDTH
} from './constants'
import { computeHorizonTargetRadius } from './horizonOverlay'
import { StarMapSettings } from './types'
import {
    buildLiveSettingsPatch,
    buildSkyviewPatch,
    buildVisualConfig,
    clampPopupPosition,
    computeHorizonCanvasLayout,
    computeHorizonCoverZoom,
    computeHorizonStartZoom,
    getPopupArrowTop,
    sanitizeStarMapSettings
} from './utils'

const makeSettings = (overrides: Partial<StarMapSettings> = {}): StarMapSettings => ({
    ...DEFAULT_STARMAP_SETTINGS,
    ...overrides
})

describe('star-map utils', () => {
    describe('computeHorizonCanvasLayout', () => {
        it('landscape: dome diameter = the fitted height, padding fills the remaining width', () => {
            expect(computeHorizonCanvasLayout(1160, 699)).toStrictEqual({
                width: Math.round(699 * HORIZON_FIT_FRACTION),
                backgroundWidth: 1160 - Math.round(699 * HORIZON_FIT_FRACTION)
            })
        })

        it('portrait: dome diameter = the fitted width, padding fills the remaining height', () => {
            expect(computeHorizonCanvasLayout(390, 700)).toStrictEqual({
                width: Math.round(390 * HORIZON_FIT_FRACTION),
                backgroundWidth: 700 - Math.round(390 * HORIZON_FIT_FRACTION)
            })
        })

        it('leaves a margin even in a square container — the dome must not touch the edges', () => {
            const { width, backgroundWidth } = computeHorizonCanvasLayout(700, 700)

            expect(width).toBe(Math.round(700 * HORIZON_FIT_FRACTION))
            expect(width).toBeLessThan(700)
            expect(width + backgroundWidth).toBe(700)
        })

        it('the whole-sky dome is exactly the base scale, so it is also the zoom-out limit', () => {
            const container = { width: 1160, height: 699 }
            const { width } = computeHorizonCanvasLayout(container.width, container.height)

            // The projection width is the dome's diameter at zoom factor 1 — Celestial's
            // minimum — and computeHorizonTargetRadius is what a fit-to-view asks for
            expect(width / 2).toBeCloseTo(computeHorizonTargetRadius(container), 0)
        })

        it('never produces a zero or negative projection width', () => {
            expect(computeHorizonCanvasLayout(0, 0).width).toBe(1)
            expect(computeHorizonCanvasLayout(0, 0).backgroundWidth).toBe(0)
        })
    })

    describe('computeHorizonStartZoom', () => {
        it('opens closer than the floor, by exactly the configured multiple', () => {
            expect(computeHorizonStartZoom(1160, 786)).toBeCloseTo(
                computeHorizonCoverZoom(1160, 786) * INITIAL_HORIZON_ZOOM,
                6
            )
            expect(computeHorizonStartZoom(1160, 786)).toBeGreaterThan(computeHorizonCoverZoom(1160, 786))
        })

        it('never opens below the floor — that would leave dead space around the sky', () => {
            expect(INITIAL_HORIZON_ZOOM).toBeGreaterThanOrEqual(1)
        })
    })

    describe('computeHorizonCoverZoom', () => {
        it('is the factor whose dome radius reaches the container corner', () => {
            const [width, height] = [1160, 786]
            const domeRadius = computeHorizonCanvasLayout(width, height).width / 2

            expect(domeRadius * computeHorizonCoverZoom(width, height)).toBeCloseTo(Math.hypot(width, height) / 2, 6)
        })

        it("always zooms in relative to the fitted dome — never below Celestial's own floor", () => {
            expect(computeHorizonCoverZoom(1160, 786)).toBeGreaterThan(1)
            expect(computeHorizonCoverZoom(390, 584)).toBeGreaterThan(1)
            // Even a square container: the corner is further out than the fitted dome's rim
            expect(computeHorizonCoverZoom(700, 700)).toBeGreaterThan(1)
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
        // The browser offset is whatever the test machine's zone says — pin it to a fake
        // "UTC-7 in winter, UTC-6 in summer" so the expectations are concrete numbers
        const offsetByMonth = (date: Date) => (date.getUTCMonth() >= 3 && date.getUTCMonth() <= 9 ? 360 : 420)
        let spy: jest.SpyInstance<number, []>

        beforeEach(() => {
            spy = jest.spyOn(Date.prototype, 'getTimezoneOffset').mockImplementation(function (this: Date) {
                return offsetByMonth(this)
            })
        })

        afterEach(() => {
            spy.mockRestore()
        })

        it('pins the timezone to the browser offset of the given instant, in Celestial minutes (east-positive)', () => {
            const date = new Date('2026-09-01T18:00:00Z')

            expect(buildSkyviewPatch(date)).toStrictEqual({ date, timezone: -360 })
        })

        it('includes the location only when one is given', () => {
            const date = new Date('2026-01-15T12:00:00Z')

            expect(buildSkyviewPatch(date, [51.82, 55.17]).location).toStrictEqual([51.82, 55.17])
            expect('location' in buildSkyviewPatch(date)).toBe(false)
        })

        it('uses the offset of the target instant, not of today (DST-safe)', () => {
            const winter = new Date('2026-01-15T12:00:00Z')
            const summer = new Date('2026-07-15T12:00:00Z')

            expect(buildSkyviewPatch(winter).timezone).toBe(-420)
            expect(buildSkyviewPatch(summer).timezone).toBe(-360)
        })
    })

    describe('sanitizeStarMapSettings', () => {
        it('returns the defaults for anything that is not an object', () => {
            expect(sanitizeStarMapSettings(null)).toStrictEqual(DEFAULT_STARMAP_SETTINGS)
            expect(sanitizeStarMapSettings('{}')).toStrictEqual(DEFAULT_STARMAP_SETTINGS)
            expect(sanitizeStarMapSettings([1, 2])).toStrictEqual(DEFAULT_STARMAP_SETTINGS)
            expect(sanitizeStarMapSettings(42)).toStrictEqual(DEFAULT_STARMAP_SETTINGS)
        })

        it('keeps a valid stored blob as is', () => {
            const stored: StarMapSettings = {
                ...DEFAULT_STARMAP_SETTINGS,
                viewMode: 'horizon',
                starsLimit: 4,
                dsosShow: true,
                geopos: [55.75, 37.62],
                center: [120, -15, 90]
            }

            expect(sanitizeStarMapSettings(stored)).toStrictEqual(stored)
        })

        it('falls back per field, keeping the valid neighbours of a poisoned one', () => {
            const settings = sanitizeStarMapSettings({
                viewMode: 'planetarium',
                starsLimit: '6',
                dsosShow: 'yes',
                milkyWay: false,
                geopos: [999, 55.17],
                center: [0, 20],
                planetsShow: 0
            })

            expect(settings.viewMode).toBe('sky')
            expect(settings.starsLimit).toBe(DEFAULT_STARMAP_SETTINGS.starsLimit)
            expect(settings.dsosShow).toBe(DEFAULT_STARMAP_SETTINGS.dsosShow)
            expect(settings.planetsShow).toBe(DEFAULT_STARMAP_SETTINGS.planetsShow)
            expect(settings.geopos).toStrictEqual(DEFAULT_STARMAP_SETTINGS.geopos)
            expect(settings.center).toStrictEqual(DEFAULT_STARMAP_SETTINGS.center)
            // The one valid override survives
            expect(settings.milkyWay).toBe(false)
        })

        it('rejects non-finite numbers and out-of-range values that would poison the astronomy math', () => {
            expect(sanitizeStarMapSettings({ geopos: [NaN, 0] }).geopos).toStrictEqual(DEFAULT_STARMAP_SETTINGS.geopos)
            expect(sanitizeStarMapSettings({ geopos: [0, null] }).geopos).toStrictEqual(DEFAULT_STARMAP_SETTINGS.geopos)
            expect(sanitizeStarMapSettings({ geopos: [45, 181] }).geopos).toStrictEqual(DEFAULT_STARMAP_SETTINGS.geopos)
            expect(sanitizeStarMapSettings({ geopos: '51.8,55.2' }).geopos).toStrictEqual(
                DEFAULT_STARMAP_SETTINGS.geopos
            )
            expect(sanitizeStarMapSettings({ center: [1, 2, Infinity] }).center).toStrictEqual(
                DEFAULT_STARMAP_SETTINGS.center
            )
            expect(sanitizeStarMapSettings({ center: [1, 2, 3, 4] }).center).toStrictEqual(
                DEFAULT_STARMAP_SETTINGS.center
            )
            expect(sanitizeStarMapSettings({ starsLimit: 0 }).starsLimit).toBe(DEFAULT_STARMAP_SETTINGS.starsLimit)
            expect(sanitizeStarMapSettings({ starsLimit: 7 }).starsLimit).toBe(DEFAULT_STARMAP_SETTINGS.starsLimit)
            expect(sanitizeStarMapSettings({ starsLimit: 1 }).starsLimit).toBe(1)
        })

        it('drops unknown keys and never lets a stored blob throw later', () => {
            const settings = sanitizeStarMapSettings({ __proto__: { evil: true }, legacyKey: 1, viewMode: 'sky' })

            expect(settings).toStrictEqual(DEFAULT_STARMAP_SETTINGS)
            expect('legacyKey' in settings).toBe(false)
            // The defaults object itself is never handed out to be mutated
            expect(settings).not.toBe(DEFAULT_STARMAP_SETTINGS)
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
