import { getFilterColorType, getSensorColorType } from './colors'

describe('colors', () => {
    describe('getFilterColorType', () => {
        it('returns "grey" for filter "L"', () => {
            expect(getFilterColorType('L')).toBe('grey')
        })

        it('returns "red" for filter "R"', () => {
            expect(getFilterColorType('R')).toBe('red')
        })

        it('returns "green" for filter "G"', () => {
            expect(getFilterColorType('G')).toBe('green')
        })

        it('returns "blue" for filter "B"', () => {
            expect(getFilterColorType('B')).toBe('blue')
        })

        it('returns "teal" for filter "H"', () => {
            expect(getFilterColorType('H')).toBe('teal')
        })

        it('returns "cyan" for filter "O"', () => {
            expect(getFilterColorType('O')).toBe('cyan')
        })

        it('returns "magenta" for filter "S"', () => {
            expect(getFilterColorType('S')).toBe('magenta')
        })

        it('returns "air" for filter "N"', () => {
            expect(getFilterColorType('N')).toBe('air')
        })

        it('returns undefined for undefined input', () => {
            expect(getFilterColorType(undefined)).toBeUndefined()
        })
    })

    describe('getSensorColorType', () => {
        it('returns "red" for "temperature"', () => {
            expect(getSensorColorType('temperature')).toBe('red')
        })

        it('returns "orange" for "feelsLike"', () => {
            expect(getSensorColorType('feelsLike')).toBe('orange')
        })

        it('returns "purple" for "pressure"', () => {
            expect(getSensorColorType('pressure')).toBe('purple')
        })

        it('returns "cyan" for "humidity"', () => {
            expect(getSensorColorType('humidity')).toBe('cyan')
        })

        it('returns "lightblue" for "dewPoint"', () => {
            expect(getSensorColorType('dewPoint')).toBe('lightblue')
        })

        it('returns "air" for "visibility"', () => {
            expect(getSensorColorType('visibility')).toBe('air')
        })

        it('returns "violet" for "uvIndex"', () => {
            expect(getSensorColorType('uvIndex')).toBe('violet')
        })

        it('returns "yellow" for "solEnergy"', () => {
            expect(getSensorColorType('solEnergy')).toBe('yellow')
        })

        it('returns "lime" for "solRadiation"', () => {
            expect(getSensorColorType('solRadiation')).toBe('lime')
        })

        it('returns "navy" for "clouds"', () => {
            expect(getSensorColorType('clouds')).toBe('navy')
        })

        it('returns "blue" for "precipitation"', () => {
            expect(getSensorColorType('precipitation')).toBe('blue')
        })

        it('returns "green" for "windSpeed"', () => {
            expect(getSensorColorType('windSpeed')).toBe('green')
        })

        it('returns "teal" for "windGust"', () => {
            expect(getSensorColorType('windGust')).toBe('teal')
        })

        it('returns "olive" for "windDeg"', () => {
            expect(getSensorColorType('windDeg')).toBe('olive')
        })

        it('returns "grey" for undefined input (safe default)', () => {
            expect(getSensorColorType(undefined)).toBe('grey')
        })

        it('returns "grey" for "date" field', () => {
            expect(getSensorColorType('date')).toBe('grey')
        })
    })
})
