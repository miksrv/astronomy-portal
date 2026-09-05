import catalog from '@/public/data/cities.json'

import { City, findNearestCity, getCityDisplayName, haversineKm, matchCities } from './cities'
import { DEFAULT_STARMAP_SETTINGS } from './constants'

const fixture: City[] = [
    { id: 'moscow', name: 'Москва', nameEn: 'Moscow', country: 'RU', lat: 55.75, lon: 37.62 },
    { id: 'orel', name: 'Орёл', nameEn: 'Oryol', country: 'RU', lat: 52.97, lon: 36.07 },
    { id: 'orenburg', name: 'Оренбург', nameEn: 'Orenburg', country: 'RU', lat: 51.77, lon: 55.1 },
    { id: 'omsk', name: 'Омск', nameEn: 'Omsk', country: 'RU', lat: 54.99, lon: 73.37 },
    { id: 'minsk', name: 'Минск', nameEn: 'Minsk', country: 'BY', lat: 53.9, lon: 27.57 },
    { id: 'los-angeles', name: 'Лос-Анджелес', nameEn: 'Los Angeles', country: 'US', lat: 34.05, lon: -118.24 }
]

describe('star-map cities', () => {
    describe('matchCities', () => {
        it('matches the Russian name case-insensitively', () => {
            expect(matchCities(fixture, 'моС').map((city) => city.id)).toStrictEqual(['moscow'])
        })

        it('matches the English name', () => {
            expect(matchCities(fixture, 'angel').map((city) => city.id)).toStrictEqual(['los-angeles'])
        })

        it('ranks prefix matches before substring matches', () => {
            // "ор" is a prefix of Орёл and Оренбург (shorter name first); nothing else matches
            expect(matchCities(fixture, 'ор').map((city) => city.id)).toStrictEqual(['orel', 'orenburg'])
        })

        it('puts a substring match after prefix matches', () => {
            // "ск" starts nothing and sits inside Омск / Минск / Москва → substring matches, shorter first
            expect(matchCities(fixture, 'ск').map((city) => city.id)).toStrictEqual(['omsk', 'minsk', 'moscow'])
        })

        it('folds ё into е so "орел" finds Орёл', () => {
            expect(matchCities(fixture, 'орел').map((city) => city.id)).toStrictEqual(['orel'])
        })

        it('returns nothing for queries shorter than two characters', () => {
            expect(matchCities(fixture, 'м')).toStrictEqual([])
            expect(matchCities(fixture, ' ')).toStrictEqual([])
        })

        it('honours the limit', () => {
            expect(matchCities(fixture, 'о', 1)).toStrictEqual([])
            expect(matchCities(fixture, 'ор', 1)).toHaveLength(1)
        })
    })

    describe('haversineKm', () => {
        it('measures Moscow → Saint Petersburg at roughly 635 km', () => {
            expect(haversineKm([55.75, 37.62], [59.94, 30.31])).toBeGreaterThan(620)
            expect(haversineKm([55.75, 37.62], [59.94, 30.31])).toBeLessThan(650)
        })

        it('is zero for the same point', () => {
            expect(haversineKm([10, 20], [10, 20])).toBe(0)
        })
    })

    describe('findNearestCity', () => {
        it('returns the city within the radius', () => {
            // The observatory's default position is ~7 km from the Orenburg city center
            expect(findNearestCity(DEFAULT_STARMAP_SETTINGS.geopos, fixture)?.id).toBe('orenburg')
        })

        it('returns null when nothing is within the radius', () => {
            expect(findNearestCity([60, 60], fixture)).toBeNull()
        })

        it('picks the closest of several candidates', () => {
            const close: City[] = [
                { ...fixture[0]!, id: 'far', lat: 55.9, lon: 37.62 },
                { ...fixture[0]!, id: 'near', lat: 55.76, lon: 37.62 }
            ]

            expect(findNearestCity([55.75, 37.62], close)?.id).toBe('near')
        })
    })

    describe('getCityDisplayName', () => {
        it('uses the Russian name for ru and English otherwise', () => {
            expect(getCityDisplayName(fixture[0]!, 'ru')).toBe('Москва')
            expect(getCityDisplayName(fixture[0]!, 'en')).toBe('Moscow')
            expect(getCityDisplayName(fixture[0]!)).toBe('Moscow')
        })
    })

    describe('bundled cities.json', () => {
        const cities = catalog as City[]

        it('is a sizeable catalog with unique ids', () => {
            expect(cities.length).toBeGreaterThanOrEqual(130)
            expect(new Set(cities.map((city) => city.id)).size).toBe(cities.length)
        })

        it('has valid coordinates, names and country codes on every entry', () => {
            for (const city of cities) {
                expect(city.lat).toBeGreaterThanOrEqual(-90)
                expect(city.lat).toBeLessThanOrEqual(90)
                expect(city.lon).toBeGreaterThanOrEqual(-180)
                expect(city.lon).toBeLessThanOrEqual(180)
                expect(city.name.trim().length).toBeGreaterThan(0)
                expect(city.nameEn.trim().length).toBeGreaterThan(0)
                expect(city.country).toMatch(/^[A-Z]{2}$/)
                expect(city.id).toMatch(/^[a-z0-9-]+$/)
            }
        })

        it('places Orenburg next to the observatory default position', () => {
            const orenburg = cities.find((city) => city.id === 'orenburg')

            expect(orenburg).toBeDefined()
            // True city-center coordinates; the observatory sits ~7 km away, well inside
            // the 25 km radius the status chip uses to label a position with a city name
            expect(haversineKm(DEFAULT_STARMAP_SETTINGS.geopos, [orenburg!.lat, orenburg!.lon])).toBeLessThan(10)
        })
    })
})
