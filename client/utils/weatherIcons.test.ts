import { getWeatherKind } from './weatherIcons'

describe('getWeatherKind', () => {
    it('folds OpenWeather codes into kinds', () => {
        expect(getWeatherKind(800)).toBe('clear')
        expect(getWeatherKind(801)).toBe('partly')
        expect(getWeatherKind(802)).toBe('partly')
        expect(getWeatherKind(803)).toBe('cloudy')
        expect(getWeatherKind(804)).toBe('cloudy')
        expect(getWeatherKind(500)).toBe('rain')
        expect(getWeatherKind(301)).toBe('rain')
        expect(getWeatherKind(601)).toBe('snow')
        expect(getWeatherKind(211)).toBe('storm')
        expect(getWeatherKind(741)).toBe('fog')
    })

    it('falls back to the cloud cover without a code', () => {
        expect(getWeatherKind(undefined, 10)).toBe('clear')
        expect(getWeatherKind(undefined, 50)).toBe('partly')
        expect(getWeatherKind(undefined, 90)).toBe('cloudy')
    })
})
