import { IconTypes } from 'simple-react-ui-kit'

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog'

/**
 * The OpenWeather condition code (`weatherId`) the station's forecast uses, folded into the
 * handful of kinds the UI tells apart: 2xx thunderstorm, 3xx drizzle, 5xx rain, 6xx snow,
 * 7xx fog/haze, 800 clear, 801–802 few/scattered clouds, 803–804 broken/overcast.
 */
export const getWeatherKind = (weatherId?: number, clouds?: number): WeatherKind => {
    if (weatherId === undefined) {
        return (clouds ?? 100) < 30 ? 'clear' : (clouds ?? 100) < 70 ? 'partly' : 'cloudy'
    }

    if (weatherId >= 200 && weatherId < 300) {
        return 'storm'
    }

    if (weatherId >= 300 && weatherId < 600) {
        return 'rain'
    }

    if (weatherId >= 600 && weatherId < 700) {
        return 'snow'
    }

    if (weatherId >= 700 && weatherId < 800) {
        return 'fog'
    }

    if (weatherId === 800) {
        return 'clear'
    }

    return weatherId <= 802 ? 'partly' : 'cloudy'
}

/** The kit icon for a kind of weather (the kit has no dedicated rain/snow glyphs) */
export const WEATHER_KIND_ICONS: Record<WeatherKind, IconTypes> = {
    clear: 'Sun',
    partly: 'Cloud',
    cloudy: 'Cloud',
    rain: 'WaterDrop',
    snow: 'Water',
    storm: 'Lightning',
    fog: 'Wind'
}
