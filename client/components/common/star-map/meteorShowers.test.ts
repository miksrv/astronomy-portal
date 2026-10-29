import { daysToPeak, getNearestPeakShowerId, isShowerActive, MeteorShower } from './meteorShowers'

const makeShower = (overrides: Partial<MeteorShower>): MeteorShower => ({
    id: 'TST',
    name: 'Test shower',
    nameRu: 'Тестовый поток',
    ra: 100,
    dec: 30,
    activeFrom: '07-17',
    activeTo: '08-24',
    peak: '08-12',
    zhr: 100,
    ...overrides
})

describe('star-map meteor showers', () => {
    describe('isShowerActive', () => {
        const perseids = makeShower({})

        it('is active inside the window', () => {
            expect(isShowerActive(perseids, new Date('2026-08-12T00:00:00Z'))).toBe(true)
        })

        it('is inactive outside the window', () => {
            expect(isShowerActive(perseids, new Date('2026-03-01T00:00:00Z'))).toBe(false)
        })

        it('handles a window wrapping over the new year (Quadrantids)', () => {
            const quadrantids = makeShower({ activeFrom: '12-28', activeTo: '01-12', peak: '01-03' })

            expect(isShowerActive(quadrantids, new Date('2026-01-05T00:00:00Z'))).toBe(true)
            expect(isShowerActive(quadrantids, new Date('2026-12-30T00:00:00Z'))).toBe(true)
            expect(isShowerActive(quadrantids, new Date('2026-07-01T00:00:00Z'))).toBe(false)
        })
    })

    describe('daysToPeak', () => {
        it('measures distance to the nearest peak occurrence', () => {
            const perseids = makeShower({})

            expect(daysToPeak(perseids, new Date('2026-08-12T00:00:00Z'))).toBe(0)
            expect(daysToPeak(perseids, new Date('2026-08-10T00:00:00Z'))).toBe(2)
        })

        it('uses the adjacent year when it is closer (early January vs a late-December peak)', () => {
            const ursids = makeShower({ activeFrom: '12-17', activeTo: '12-26', peak: '12-22' })

            expect(daysToPeak(ursids, new Date('2027-01-01T00:00:00Z'))).toBe(10)
        })
    })

    describe('getNearestPeakShowerId', () => {
        const showers = [
            makeShower({ id: 'PER', activeFrom: '07-17', activeTo: '08-24', peak: '08-12' }),
            makeShower({ id: 'SDA', activeFrom: '07-12', activeTo: '08-23', peak: '07-30' }),
            makeShower({ id: 'GEM', activeFrom: '12-04', activeTo: '12-17', peak: '12-14' })
        ]

        it('picks the active shower closest to its peak', () => {
            expect(getNearestPeakShowerId(showers, new Date('2026-08-10T00:00:00Z'))).toBe('PER')
            expect(getNearestPeakShowerId(showers, new Date('2026-07-25T00:00:00Z'))).toBe('SDA')
        })

        it('returns null when nothing is active', () => {
            expect(getNearestPeakShowerId(showers, new Date('2026-03-01T00:00:00Z'))).toBeNull()
        })
    })
})
