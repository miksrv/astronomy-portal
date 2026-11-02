import {
    getActivityLevel,
    getActivityWeeks,
    getActivityYears,
    getYearTotals,
    toTelescopeNights
} from './telescopeActivity'

const nights = toTelescopeNights([
    { telescope_date: '2024-10-14', total_exposure: 16500, frames_count: 55, catalog_items: ['NGC_1499', 'NGC_281'] },
    { telescope_date: '2024-10-15', total_exposure: 12300, frames_count: 41, catalog_items: ['NGC_281'] },
    { telescope_date: '2023-01-02', total_exposure: 1200, frames_count: 2, catalog_items: ['NGC_7822'] }
])

describe('telescopeActivity', () => {
    it('reads the statistic, the latest night first', () => {
        expect(nights.map(({ date }) => date)).toEqual(['2024-10-15', '2024-10-14', '2023-01-02'])
        expect(nights[0]).toEqual({ date: '2024-10-15', exposure: 12300, frames: 41, objects: ['NGC_281'] })
    })

    it('shades a night by its hours of exposure', () => {
        expect(getActivityLevel(0)).toBe(0)
        expect(getActivityLevel(1200)).toBe(1)
        expect(getActivityLevel(2 * 3600)).toBe(2)
        expect(getActivityLevel(4 * 3600)).toBe(3)
        expect(getActivityLevel(6 * 3600)).toBe(4)
    })

    it('lists the years with nights', () => {
        expect(getActivityYears(nights)).toEqual([2023, 2024])
    })

    it('lays a year out in Monday-first weeks', () => {
        const weeks = getActivityWeeks(2024, nights)
        // 1 Jan 2024 is a Monday: no padding before it
        expect(weeks[0]?.days[0]).toEqual({ date: '2024-01-01', inYear: true, night: undefined })
        expect(weeks[0]?.month).toBe(0)
        expect(weeks.every(({ days }) => days.length === 7)).toBe(true)
        expect(weeks.flatMap(({ days }) => days).filter(({ inYear }) => inYear)).toHaveLength(366)
        expect(weeks.flatMap(({ days }) => days).find(({ date }) => date === '2024-10-14')?.night?.frames).toBe(55)
        expect(weeks.filter(({ month }) => month !== undefined)).toHaveLength(12)
    })

    it('sums a year up', () => {
        expect(getYearTotals(nights, 2024)).toEqual({ nights: 2, exposure: 28800, frames: 96, objects: 2 })
    })
})
