import { CatalogPosition } from './catalogs'
import { BuiltinHitOptions, filterByMagnitude, findBuiltinHit, HIT_RADIUS } from './hitTest'
import { MeteorShower } from './meteorShowers'
import { BodyPosition } from './objectInfo'

// A flat stand-in for d3-celestial: 1° = 10px, no clipping unless a test overrides it
const projection = jest.fn(([ra, dec]: [number, number]) => [ra * 10, dec * 10])
const clip = jest.fn(() => true)

// Each test file runs in its own jsdom realm, so the global only lives for this suite
;(globalThis as { Celestial?: unknown }).Celestial = { clip, mapProjection: projection }

beforeEach(() => {
    projection.mockClear()
    clip.mockClear()
    clip.mockImplementation(() => true)
})

const star = (id: string, ra: number, dec: number, mag = 2): CatalogPosition => ({ id, ra, dec, mag })
const dso = (id: string, ra: number, dec: number, mag = 5): CatalogPosition => ({ id, ra, dec, mag })

const body = (name: string, ra: number, dec: number, kind: BodyPosition['kind'] = 'planet'): BodyPosition =>
    ({ body: name, kind, ra, dec }) as BodyPosition

const radiant = (id: string, ra: number, dec: number): MeteorShower => ({
    id,
    name: id,
    nameRu: id,
    ra,
    dec,
    activeFrom: '01-01',
    activeTo: '12-31',
    peak: '06-01',
    zhr: 10
})

const options = (overrides: Partial<BuiltinHitOptions> = {}): BuiltinHitOptions => ({
    starsVisible: true,
    starsLimit: 6,
    dsosVisible: true,
    planetsVisible: true,
    stars: [],
    dsos: [],
    bodies: [],
    radiants: [],
    ...overrides
})

describe('star-map hitTest', () => {
    describe('findBuiltinHit', () => {
        it('returns null when nothing is within reach', () => {
            expect(findBuiltinHit(0, 0, options({ stars: [star('1', 50, 50)] }))).toBeNull()
        })

        it('prefers radiants, then bodies, then DSOs, then stars at the same spot', () => {
            const all = options({
                radiants: [radiant('PER', 10, 10)],
                bodies: [body('Mars', 10, 10)],
                dsos: [dso('M31', 10, 10)],
                stars: [star('91262', 10, 10)]
            })

            expect(findBuiltinHit(100, 100, all)?.kind).toBe('radiant')
            expect(findBuiltinHit(100, 100, { ...all, radiants: [] })?.kind).toBe('planet')
            expect(findBuiltinHit(100, 100, { ...all, radiants: [], bodies: [] })?.kind).toBe('dso')
            expect(findBuiltinHit(100, 100, { ...all, radiants: [], bodies: [], dsos: [] })?.kind).toBe('star')
        })

        it('reports the hit with the layer-specific id, coordinates and magnitude', () => {
            const hit = findBuiltinHit(100, 100, options({ stars: [star('91262', 10, 10, 0.03)] }))

            expect(hit).toStrictEqual({ kind: 'star', id: '91262', ra: 10, dec: 10, magnitude: 0.03 })

            const moon = findBuiltinHit(100, 100, options({ bodies: [body('Moon', 10, 10, 'moon')] }))

            expect(moon).toStrictEqual({ kind: 'moon', id: 'Moon', ra: 10, dec: 10 })
        })

        it('uses a per-layer hit radius', () => {
            // Star sits 8px right of the cursor: outside the 7px star radius…
            const stars = options({ stars: [star('1', 10.8, 10)] })
            expect(findBuiltinHit(100, 100, stars)).toBeNull()
            expect(findBuiltinHit(100 + HIT_RADIUS.star - 1, 100, stars)?.id).toBe('1')

            // …while a body 13px away is still inside the 14px body radius
            expect(findBuiltinHit(100, 100, options({ bodies: [body('Mars', 11.3, 10)] }))?.id).toBe('Mars')
            expect(findBuiltinHit(100, 100, options({ bodies: [body('Mars', 11.5, 10)] }))).toBeNull()
        })

        it('picks the closest candidate within a layer', () => {
            const hit = findBuiltinHit(100, 100, options({ stars: [star('far', 10.5, 10), star('near', 10.1, 10)] }))

            expect(hit?.id).toBe('near')
        })

        it('ignores stars dimmer than the current magnitude limit', () => {
            const dim = options({ stars: [star('1', 10, 10, 5.5)], starsLimit: 4 })

            expect(findBuiltinHit(100, 100, dim)).toBeNull()
            expect(findBuiltinHit(100, 100, { ...dim, starsLimit: 6 })?.id).toBe('1')
        })

        it('skips layers that are switched off', () => {
            const hidden = options({
                starsVisible: false,
                dsosVisible: false,
                planetsVisible: false,
                stars: [star('1', 10, 10)],
                dsos: [dso('M31', 10, 10)],
                bodies: [body('Mars', 10, 10)]
            })

            expect(findBuiltinHit(100, 100, hidden)).toBeNull()
        })

        it('always tests radiants — the caller passes only the ones actually drawn', () => {
            const hit = findBuiltinHit(
                100,
                100,
                options({
                    starsVisible: false,
                    dsosVisible: false,
                    planetsVisible: false,
                    radiants: [radiant('GEM', 10, 10)]
                })
            )

            expect(hit?.kind).toBe('radiant')
        })

        it('wraps right ascension above 180° into the [-180, 180) range the data files use', () => {
            findBuiltinHit(0, 0, options({ stars: [star('1', 350, 10)] }))

            expect(projection).toHaveBeenCalledWith([-10, 10])
        })

        it('skips points outside the visible hemisphere', () => {
            clip.mockImplementation(() => false)

            expect(findBuiltinHit(100, 100, options({ stars: [star('1', 10, 10)] }))).toBeNull()
            expect(projection).not.toHaveBeenCalled()
        })
    })

    describe('filterByMagnitude', () => {
        it('keeps entries at or brighter than the limit and drops the ones without a magnitude', () => {
            const items = [{ id: 'bright', mag: 1 }, { id: 'edge', mag: 4 }, { id: 'dim', mag: 4.1 }, { id: 'unknown' }]

            expect(filterByMagnitude(items, 4).map((item) => item.id)).toStrictEqual(['bright', 'edge'])
        })
    })
})
