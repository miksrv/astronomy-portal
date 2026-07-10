import { getGoogleMapLink, getYandexMapLink } from './maps'

describe('maps', () => {
    it('builds a Yandex Maps link with lon,lat order', () => {
        expect(getYandexMapLink(51.8250225, 55.71072)).toBe('https://yandex.ru/maps/?pt=55.71072,51.8250225&z=16&l=map')
    })

    it('builds a Google Maps link with lat,lon order', () => {
        expect(getGoogleMapLink(51.8250225, 55.71072)).toBe('https://www.google.com/maps?q=51.8250225,55.71072')
    })
})
