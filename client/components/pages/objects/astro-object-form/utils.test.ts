import { coordinateToText, parseDec, parseRA } from './utils'

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
