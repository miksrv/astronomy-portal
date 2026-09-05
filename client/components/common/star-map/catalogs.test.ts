import { getDsoDisplayName, getStarDisplayName, parseCatalogPositions } from './catalogs'

describe('star-map catalogs', () => {
    describe('parseCatalogPositions', () => {
        it('coerces string magnitudes to numbers (dsos.6.json stores mag as "1.2")', () => {
            const positions = parseCatalogPositions({
                features: [
                    { id: 'M 45', properties: { mag: '1.2' }, geometry: { coordinates: [56.75, 24.12] } },
                    { id: 'M 8', properties: { mag: 5 }, geometry: { coordinates: [-89.05, -24.38] } }
                ]
            })

            expect(positions).toStrictEqual([
                { id: 'M 45', ra: 56.75, dec: 24.12, mag: 1.2 },
                { id: 'M 8', ra: -89.05, dec: -24.38, mag: 5 }
            ])
        })

        it('drops absent or non-numeric magnitudes instead of passing them through', () => {
            const positions = parseCatalogPositions({
                features: [
                    { id: 'A', geometry: { coordinates: [10, 20] } },
                    { id: 'B', properties: { mag: 'n/a' }, geometry: { coordinates: [30, 40] } }
                ]
            })

            expect(positions.map((position) => position.mag)).toStrictEqual([undefined, undefined])
        })

        it('skips features without an id or coordinates', () => {
            const positions = parseCatalogPositions({
                features: [
                    { properties: { mag: 1 }, geometry: { coordinates: [1, 2] } },
                    { id: 'no-coords', properties: { mag: 1 } },
                    { id: 42, geometry: { coordinates: [3, 4] } }
                ]
            })

            expect(positions).toStrictEqual([{ id: '42', ra: 3, dec: 4, mag: undefined }])
        })
    })

    describe('display names', () => {
        it('prefers the Russian star name for the ru locale, falling back to HIP', () => {
            const names = { '91262': { name: 'Vega', ru: 'Вега' } }

            expect(getStarDisplayName('91262', names, 'ru')).toBe('Вега')
            expect(getStarDisplayName('91262', names, 'en')).toBe('Vega')
            expect(getStarDisplayName('99999', names, 'ru')).toBe('HIP 99999')
        })

        it('appends the catalog id to a named DSO', () => {
            const names = { 'NGC 224': { name: 'Andromeda Galaxy', ru: 'Галактика Андромеды' } }

            expect(getDsoDisplayName('NGC 224', names, 'ru')).toBe('Галактика Андромеды (NGC 224)')
            expect(getDsoDisplayName('NGC 1234', names, 'en')).toBe('NGC 1234')
        })
    })
})
