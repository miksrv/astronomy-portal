import { getConstellationName } from './constellations'

describe('getConstellationName', () => {
    it('finds the constellation of a point', () => {
        // IC 1396 - Cepheus, M 42 - Orion
        expect(getConstellationName(323.977, 57.5555, 'ru')).toBe('Цефей')
        expect(getConstellationName(83.82, -5.39, 'en')).toBe('Orion')
    })
})
