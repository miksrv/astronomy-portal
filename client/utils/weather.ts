import { ApiModel } from '@/api'

export type WeatherRange = 'good' | 'warning' | 'danger'

export type WeatherKey = 'temperature' | 'humidity' | 'clouds' | 'windSpeed' | 'windGust' | 'precipitation'

/**
 * The observatory's safety limits per sensor: outside [min, max] the roof stays closed. A value
 * within 25% of a limit is already a warning. `scale` is the range a meter is drawn over.
 */
export const WEATHER_LIMITS: Record<WeatherKey, { min: number; max: number; scale: [number, number] }> = {
    temperature: { min: -24, max: 24, scale: [-30, 30] },
    humidity: { min: 0, max: 90, scale: [0, 100] },
    clouds: { min: 0, max: 50, scale: [0, 100] },
    windSpeed: { min: 0, max: 10, scale: [0, 15] },
    windGust: { min: 0, max: 8, scale: [0, 15] },
    // Any rain is too much: 0 is good (the `=== 0` shortcut), anything above the limit is critical
    precipitation: { min: 0, max: 0.1, scale: [0, 5] }
}

export const WEATHER_KEYS = Object.keys(WEATHER_LIMITS) as WeatherKey[]

const WARNING_MARGIN = 1.25

/** How safe one sensor's value is; `undefined` when there is no reading */
export const getWeatherRange = (key: WeatherKey, value?: number | null): WeatherRange | undefined => {
    if (value == null) {
        return undefined
    }

    const { min, max } = WEATHER_LIMITS[key]

    if (value === 0) {
        return 'good'
    }

    if (value > max || value < min) {
        return 'danger'
    }

    const margin = value * WARNING_MARGIN

    return margin > max || margin < min ? 'warning' : 'good'
}

/** The worst of all sensors: one critical reading makes the whole weather critical */
export const getWeatherState = (weather?: ApiModel.Weather): WeatherRange | undefined => {
    if (!weather) {
        return undefined
    }

    const ranges = WEATHER_KEYS.map((key) => getWeatherRange(key, weather[key]))

    if (ranges.includes('danger')) {
        return 'danger'
    }

    return ranges.every((range) => range === 'good' || range === undefined) ? 'good' : 'warning'
}

/** A meter's fill for a sensor, 4…100 % of its scale */
export const getWeatherMeter = (key: WeatherKey, value?: number | null): number => {
    const [from, to] = WEATHER_LIMITS[key].scale

    return Math.max(4, Math.min(100, (((value ?? from) - from) / (to - from)) * 100))
}

export type ObservingVerdict =
    'clear-dark' | 'clear-bright-moon' | 'waiting-darkness' | 'borderline' | 'closed' | 'unknown'

/** A Moon this bright above the horizon washes out broadband filters */
const BRIGHT_MOON = 0.5

/** The Sun below this altitude: astronomical night */
const NIGHT_SUN_ALTITUDE = -18

/**
 * Can the telescope shoot now: the weather combined with darkness and moonlight.
 *
 * @param sunAltitude - degrees
 * @param moonAltitude - degrees
 * @param moonFraction - illuminated fraction, 0..1
 */
export const getObservingVerdict = (
    weatherState: WeatherRange | undefined,
    sunAltitude: number,
    moonAltitude: number,
    moonFraction: number
): { verdict: ObservingVerdict; level: WeatherRange } => {
    if (!weatherState) {
        return { verdict: 'unknown', level: 'warning' }
    }

    if (weatherState === 'danger') {
        return { verdict: 'closed', level: 'danger' }
    }

    if (weatherState === 'warning') {
        return { verdict: 'borderline', level: 'warning' }
    }

    if (sunAltitude >= NIGHT_SUN_ALTITUDE) {
        return { verdict: 'waiting-darkness', level: 'warning' }
    }

    return moonAltitude > 0 && moonFraction > BRIGHT_MOON
        ? { verdict: 'clear-bright-moon', level: 'good' }
        : { verdict: 'clear-dark', level: 'good' }
}

/** A night of the daily forecast worth planning a session for */
export const isGoodForecastNight = (day: ApiModel.Weather): boolean =>
    (day.clouds ?? 100) < 30 && (day.precipitation ?? 0) < 0.1 && (day.windSpeedMax ?? day.windSpeed ?? 0) < 10
