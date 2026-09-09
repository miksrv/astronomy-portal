import { DOME_VIEW } from './horizonView'
import { buildPermalinkUrl, decodePermalink, encodePermalink } from './permalink'

describe('star-map permalink', () => {
    it('round-trips a full view state', () => {
        const date = new Date('2026-08-28T16:00:00Z')

        const query = encodePermalink({
            settings: { viewMode: 'horizon', geopos: [51.82, 55.17], atmosphere: true },
            date,
            center: [120.5, -15.25, 0],
            zoom: 2.5
        })

        const decoded = decodePermalink(query)

        expect(decoded.viewMode).toBe('horizon')
        expect(decoded.geopos).toStrictEqual([51.82, 55.17])
        expect(decoded.date?.getTime()).toBe(date.getTime())
        expect(decoded.center).toStrictEqual([120.5, -15.25, 0])
        expect(decoded.zoom).toBe(2.5)
    })

    it('omits the date when the view is "now"', () => {
        const query = encodePermalink({
            settings: { viewMode: 'sky', geopos: [0, 0], atmosphere: true },
            date: null,
            center: null,
            zoom: null
        })

        expect(query.dt).toBeUndefined()
        expect(decodePermalink(query).date).toBeUndefined()
    })

    it('rejects malformed and out-of-range values', () => {
        const decoded = decodePermalink({
            view: 'nonsense',
            lat: '999',
            lon: '55',
            dt: 'not-a-date',
            c: '1,2',
            z: '-5'
        })

        expect(decoded.viewMode).toBeUndefined()
        expect(decoded.geopos).toBeUndefined()
        expect(decoded.date).toBeUndefined()
        expect(decoded.center).toBeUndefined()
        expect(decoded.zoom).toBeUndefined()
    })

    it('shares where the visitor is looking in horizon mode, and only when it is not the dome', () => {
        const settings = { viewMode: 'horizon' as const, geopos: [51.82, 55.17] as [number, number], atmosphere: true }

        // The whole-sky dome is the default — no need to spell it out in the link
        expect(encodePermalink({ settings, date: null, view: DOME_VIEW }).az).toBeUndefined()
        expect(encodePermalink({ settings, date: null, view: null }).alt).toBeUndefined()

        const looking = encodePermalink({ settings, date: null, view: { azimuth: 127.44, altitude: 21.36 } })

        expect(looking.az).toBe('127.4')
        expect(looking.alt).toBe('21.4')
        // Azimuth is shared as its [0, 360) equivalent
        expect(encodePermalink({ settings, date: null, view: { azimuth: -90, altitude: 30 } }).az).toBe('270')

        expect(decodePermalink({ az: '127.4', alt: '21.4' }).view).toStrictEqual({ azimuth: 127.4, altitude: 21.4 })
        expect(decodePermalink({ az: '-90', alt: '30' }).view).toStrictEqual({ azimuth: 270, altitude: 30 })
        // Half a link, or an altitude outside the navigable range, is ignored
        expect(decodePermalink({ az: '127.4' }).view).toBeUndefined()
        expect(decodePermalink({ alt: '21.4' }).view).toBeUndefined()
        expect(decodePermalink({ az: '10', alt: '-40' }).view).toBeUndefined()
        expect(decodePermalink({ az: '10', alt: 'up' }).view).toBeUndefined()
        expect(decodePermalink({}).view).toBeUndefined()
    })

    it('encodes the atmosphere only when it is off, and decodes both values', () => {
        const on = encodePermalink({
            settings: { viewMode: 'horizon', geopos: [0, 0], atmosphere: true },
            date: null
        })
        const off = encodePermalink({
            settings: { viewMode: 'horizon', geopos: [0, 0], atmosphere: false },
            date: null
        })

        expect(on.atm).toBeUndefined()
        expect(decodePermalink(on).atmosphere).toBeUndefined()
        expect(off.atm).toBe('0')
        expect(decodePermalink(off).atmosphere).toBe(false)
        expect(decodePermalink({ atm: '1' }).atmosphere).toBe(true)
        expect(decodePermalink({ atm: 'yes' }).atmosphere).toBeUndefined()
    })

    it('accepts a partial permalink (location only)', () => {
        const decoded = decodePermalink({ lat: '55.75', lon: '37.62' })

        expect(decoded.geopos).toStrictEqual([55.75, 37.62])
        expect(decoded.viewMode).toBeUndefined()
    })

    it('builds an absolute URL from the query, replacing any existing search', () => {
        const query = encodePermalink({
            settings: { viewMode: 'horizon', geopos: [51.82, 55.17], atmosphere: true },
            date: new Date('2026-08-28T16:00:00Z'),
            center: null,
            zoom: null
        })

        const url = buildPermalinkUrl(query, 'https://example.test', '/starmap')

        expect(url).toBe('https://example.test/starmap?view=horizon&lat=51.82&lon=55.17&dt=2026-08-28T16%3A00%3A00Z')
        expect(decodePermalink(Object.fromEntries(new URL(url).searchParams))).toMatchObject({
            viewMode: 'horizon',
            geopos: [51.82, 55.17]
        })
    })

    it('omits the "?" when the query is empty', () => {
        expect(buildPermalinkUrl({}, 'https://example.test', '/starmap')).toBe('https://example.test/starmap')
    })
})
