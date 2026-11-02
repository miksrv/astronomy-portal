import { getTonightHours, parseMeteoDate } from './utils'

describe('forecast utils', () => {
    it('reads the meteo API dates as UTC', () => {
        expect(parseMeteoDate('2026-10-30 23:00:00')?.toISOString()).toBe('2026-10-30T23:00:00.000Z')
        expect(parseMeteoDate(undefined)).toBeUndefined()
    })

    it('keeps the hours from 18:00 to 07:00 local time of the coming night', () => {
        const hourly = Array.from({ length: 30 }, (_, i) => ({
            clouds: i,
            date: new Date(Date.UTC(2026, 9, 30, 10 + i)).toISOString().slice(0, 19).replace('T', ' ')
        }))
        // 20:00 local on 30 October
        const hours = getTonightHours(hourly, new Date('2026-10-30T15:00:00Z'))

        expect(hours[0]?.date).toBe('2026-10-30 13:00:00')
        expect(hours[hours.length - 1]?.date).toBe('2026-10-31 02:00:00')
        expect(hours).toHaveLength(14)
    })

    it('moves on to the next night once the current one is nearly over', () => {
        const hourly = Array.from({ length: 40 }, (_, i) => ({
            date: new Date(Date.UTC(2026, 9, 30, 20 + i)).toISOString().slice(0, 19).replace('T', ' ')
        }))
        // 04:00 local on 31 October
        const hours = getTonightHours(hourly, new Date('2026-10-30T23:00:00Z'))

        expect(hours[0]?.date).toBe('2026-10-31 13:00:00')
    })
})
