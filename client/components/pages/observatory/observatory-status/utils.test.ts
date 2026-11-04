import { ApiModel } from '@/api'

import {
    buildDeviceCards,
    formatCountdown,
    formatDriver,
    formatFov,
    formatOptics,
    formatSiderealTime,
    getDeviceHealth,
    getMapCenter,
    getMapZoom,
    getMinutesAgo,
    getMountState,
    getPercent,
    isNumber
} from './utils'

const mount: ApiModel.ObservatoryMount = {
    ra: 0,
    dec: 0,
    raJ2000: 10.6,
    decJ2000: 41.3,
    alt: 0,
    az: 0,
    parked: false,
    tracking: false,
    slewing: false,
    trackMode: null,
    pierSide: null,
    lst: null,
    target: null
}

describe('observatory status utils', () => {
    it('tells what the mount is doing', () => {
        expect(getMountState({ ...mount, slewing: true, tracking: true })).toBe('slewing')
        expect(getMountState({ ...mount, parked: true, tracking: true })).toBe('parked')
        expect(getMountState({ ...mount, tracking: true })).toBe('tracking')
        expect(getMountState(mount)).toBe('idle')
    })

    it('counts whole minutes since a moment', () => {
        const now = new Date('2026-11-03T22:10:30Z')

        expect(getMinutesAgo('2026-11-03T22:00:00Z', now)).toBe(10)
        expect(getMinutesAgo('2026-11-03T22:10:00Z', now)).toBe(0)
        expect(getMinutesAgo('2026-11-03T23:00:00Z', now)).toBe(0)
        expect(getMinutesAgo(null, now)).toBeUndefined()
        expect(getMinutesAgo('2026-11-03T22:00:00Z', undefined)).toBeUndefined()
        expect(getMinutesAgo('garbage', now)).toBeUndefined()
    })

    it('recognises a usable number', () => {
        expect(isNumber(0)).toBe(true)
        expect(isNumber(null)).toBe(false)
        expect(isNumber(NaN)).toBe(false)
    })

    it('builds the cards in the order of the roles, with the data on the first device of a role', () => {
        const cards = buildDeviceCards({
            time: 't',
            devices: [
                { name: 'Roof', role: 'roof', connected: true, driver: null },
                { name: 'Cam A', role: 'camera', connected: true, driver: null },
                { name: 'Cam B', role: 'camera', connected: true, driver: null },
                { name: 'Weather', role: 'weather', connected: true, driver: null },
                { name: 'Mount', role: 'mount', connected: false, driver: null }
            ],
            mount,
            camera: { exposing: false } as ApiModel.ObservatoryCamera,
            roof: { state: 'open', parked: null }
        })

        expect(cards.map(({ name, hasData }) => [name, hasData])).toStrictEqual([
            ['Mount', true],
            ['Cam A', true],
            ['Cam B', false],
            ['Roof', true],
            ['Weather', false]
        ])
    })

    it('adds a card for a section whose device the agent did not list', () => {
        const cards = buildDeviceCards({ time: 't', roof: { state: 'closed', parked: true } })

        expect(cards).toStrictEqual([
            { key: 'roof', role: 'roof', name: null, connected: true, driver: null, alerts: [], hasData: true }
        ])
    })

    it('formats the driver, the sidereal time and the field of view', () => {
        expect(formatDriver({ name: 'EQMod', version: '1.4' })).toBe('EQMod v1.4')
        expect(formatDriver({ name: 'EQMod', version: null })).toBe('EQMod')
        expect(formatDriver(null)).toBeUndefined()
        expect(formatSiderealTime(23.5512)).toBe('23:33:04')
        expect(formatSiderealTime(24.5)).toBe('00:30:00')
        expect(formatSiderealTime(null)).toBeUndefined()
        expect(formatFov({ width: 2.063, height: 1.376 }, 'en')).toBe('2.06° × 1.38°')
    })

    it('keeps a share within 0..100', () => {
        expect(getPercent(2500, 10000)).toBe(25)
        expect(getPercent(20000, 10000)).toBe(100)
        expect(getPercent(null, 10000)).toBe(0)
        expect(getPercent(5, 0)).toBe(0)
    })

    it('zooms the map to ten fields of view, within limits', () => {
        expect(getMapZoom({ width: 2, height: 1.4 })).toBe(18)
        expect(getMapZoom({ width: 0.2, height: 0.1 })).toBe(24)
        expect(getMapZoom({ width: 20, height: 10 })).toBe(8)
        expect(getMapZoom(null)).toBe(14)
    })

    it('snaps the map center to a grid', () => {
        expect(getMapCenter(mount)).toStrictEqual([10, 42])
    })
})

describe('formatCountdown', () => {
    it('formats seconds as m:ss and hours as h:mm:ss', () => {
        expect(formatCountdown(183)).toBe('3:03')
        expect(formatCountdown(9.6)).toBe('0:10')
        expect(formatCountdown(3725)).toBe('1:02:05')
        expect(formatCountdown(-5)).toBe('0:00')
    })
})

describe('formatOptics', () => {
    it('writes focal length x aperture the short way', () => {
        expect(formatOptics(1000, 200)).toBe('F1000x200')
        expect(formatOptics(1000.4, null)).toBe('F1000x?')
    })
})

describe('getDeviceHealth', () => {
    it('is an error when disconnected, a warning with INDI alerts, fine otherwise', () => {
        expect(getDeviceHealth(false, [])).toBe('error')
        expect(getDeviceHealth(false, ['Connection'])).toBe('error')
        expect(getDeviceHealth(true, ['Temperature'])).toBe('warning')
        expect(getDeviceHealth(true, [])).toBe('ok')
        expect(getDeviceHealth(true)).toBe('ok')
    })
})
