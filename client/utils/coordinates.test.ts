import { coordinateToText, formatDEC, formatDECShort, formatRA, formatRAShort, parseDec, parseRA } from './coordinates'

describe('coordinates', () => {
    describe('formatRA', () => {
        it('formats 0 degrees as "0h 0m 0.00s"', () => {
            expect(formatRA(0)).toBe('0h 0m 0.00s')
        })

        it('formats 15 degrees as "1h 0m 0.00s"', () => {
            expect(formatRA(15)).toBe('1h 0m 0.00s')
        })

        it('formats 23.4375 degrees correctly', () => {
            expect(formatRA(23.4375)).toBe('1h 33m 45.00s')
        })

        it('returns empty string for undefined', () => {
            expect(formatRA(undefined)).toBe('')
        })

        it('returns empty string for null', () => {
            // @ts-expect-error: testing null input
            expect(formatRA(null)).toBe('')
        })
    })

    describe('coordinates', () => {
        describe('formatDEC', () => {
            it('formats 0 degrees as "+0° 0′ 0.00″"', () => {
                expect(formatDEC(0)).toBe('+0° 0′ 0.00″')
            })

            it('formats positive declination', () => {
                expect(formatDEC(12.3456)).toBe('+12° 20′ 44.16″')
            })

            it('formats negative declination', () => {
                expect(formatDEC(-5.6789)).toBe('-5° 40′ 44.04″')
            })

            it('returns empty string for undefined', () => {
                expect(formatDEC(undefined)).toBe('')
            })

            it('returns empty string for null', () => {
                // @ts-expect-error: testing null input
                expect(formatDEC(null)).toBe('')
            })

            it('returns empty string for NaN', () => {
                expect(formatDEC(NaN)).toBe('')
            })
        })
    })
})

describe('formatRAShort / formatDECShort', () => {
    it('formats RA in hours, minutes and seconds', () => {
        expect(formatRAShort(323.977)).toBe('21ʰ 35ᵐ 54ˢ')
        expect(formatRAShort(0)).toBe('0ʰ 00ᵐ 00ˢ')
        expect(formatRAShort(undefined)).toBe('')
    })

    it('formats declination in degrees and minutes with a true minus', () => {
        expect(formatDECShort(57.5555)).toBe('+57° 33′')
        expect(formatDECShort(-5.39)).toBe('−5° 23′')
        expect(formatDECShort(undefined)).toBe('')
    })
})

describe('parseRA', () => {
    it('reads degrees', () => {
        expect(parseRA('202.4696')).toBe(202.4696)
        expect(parseRA('202,5')).toBe(202.5)
    })

    it('reads the hours of an atlas', () => {
        expect(parseRA('13:29:52.7')).toBeCloseTo(202.4696, 3)
        expect(parseRA('13h 29m 52.7s')).toBeCloseTo(202.4696, 3)
        expect(parseRA('13ʰ 29ᵐ 53ˢ')).toBeCloseTo(202.4708, 3)
        expect(parseRA('13 30')).toBe(202.5)
    })

    it('gives nothing for what is not a coordinate', () => {
        expect(parseRA('')).toBeUndefined()
        expect(parseRA('abc')).toBeUndefined()
        expect(parseRA('13:75:00')).toBeUndefined()
        expect(parseRA('1:2:3:4')).toBeUndefined()
    })
})

describe('parseDec', () => {
    it('reads degrees with a sign', () => {
        expect(parseDec('47.195')).toBe(47.195)
        expect(parseDec('-5.39')).toBe(-5.39)
        expect(parseDec('−5,39')).toBe(-5.39)
    })

    it('reads degrees, minutes and seconds', () => {
        expect(parseDec('+47:11:43')).toBeCloseTo(47.1953, 3)
        expect(parseDec('47° 11′ 43″')).toBeCloseTo(47.1953, 3)
        expect(parseDec('-05 23 28')).toBeCloseTo(-5.3911, 3)
    })

    it('gives nothing for what is not a coordinate', () => {
        expect(parseDec('north')).toBeUndefined()
        expect(parseDec('47:61')).toBeUndefined()
    })
})

describe('coordinateToText', () => {
    it('writes degrees without float noise', () => {
        expect(coordinateToText(202.46960000000001)).toBe('202.4696')
        expect(coordinateToText(null)).toBe('')
        expect(coordinateToText(NaN)).toBe('')
    })
})
