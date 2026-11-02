import { getNightDate, groupFramesIntoNights, toObservingFrames } from './observingLog'

describe('observingLog', () => {
    it('counts a frame after midnight to the evening before', () => {
        // 02:00 local (UTC+5) on 10 July belongs to the night of 9 July
        expect(getNightDate('2020-07-09T21:00:00Z')).toBe('2020-07-09')
        // 13:00 local on 10 July starts the night of 10 July
        expect(getNightDate('2020-07-10T08:00:00Z')).toBe('2020-07-10')
    })

    it('reads the files endpoint, dropping frames without a date', () => {
        const frames = toObservingFrames([
            {
                filter: 'H',
                exposure: 300,
                gain: 120,
                offset: 10,
                ccdTemp: -10,
                fileName: 'a.fits',
                date: { date: '2020-07-09 20:26:15.000000', timezone_type: 3, timezone: 'UTC' }
            },
            { filter: 'L', exposure: 60 }
        ])

        expect(frames).toEqual([
            {
                time: '2020-07-09T20:26:15Z',
                filter: 'H',
                exposure: 300,
                gain: 120,
                offset: 10,
                ccdTemp: -10,
                fileName: 'a.fits'
            }
        ])
    })

    it('groups frames into nights with totals, the latest night first', () => {
        const nights = groupFramesIntoNights([
            { time: '2020-07-08T18:00:00Z', filter: 'H', exposure: 300, ccdTemp: -10 },
            { time: '2020-07-09T20:00:00Z', filter: 'O', exposure: 300, ccdTemp: -10 },
            { time: '2020-07-09T19:00:00Z', filter: 'H', exposure: 300, ccdTemp: -11 },
            { time: '2020-07-09T22:00:00Z', filter: 'H', exposure: 600 }
        ])

        expect(nights.map(({ date }) => date)).toEqual(['2020-07-09', '2020-07-08'])
        expect(nights[0]).toMatchObject({ exposure: 1200, filters: { H: 2, O: 1 }, ccdTemp: -10 })
        expect(nights[0]?.frames.map(({ time }) => time)[0]).toBe('2020-07-09T19:00:00Z')
        expect(nights[0]?.moon).toBeGreaterThanOrEqual(0)
        expect(nights[0]?.moon).toBeLessThanOrEqual(1)
    })
})
