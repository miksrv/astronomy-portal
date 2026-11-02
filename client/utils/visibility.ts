import * as SunCalc from 'suncalc'

// The observatory, Orenburg: every visibility on the site is computed for this spot
export const OBSERVATORY_LAT = parseFloat(process.env.NEXT_PUBLIC_LAT ?? '51.7')
export const OBSERVATORY_LON = parseFloat(process.env.NEXT_PUBLIC_LON ?? '55.2')

/** Local noon at the observatory (UTC+5), in UTC hours: a night runs from noon to noon */
const LOCAL_NOON_UTC_HOUR = 7

/** The Sun below this altitude counts as dark enough to shoot (nautical twilight is over) */
export const DARK_SUN_ALTITUDE = -12

/** Minimum best altitude for an object to count as "visible tonight" */
export const VISIBLE_ALTITUDE = 30

/** A best altitude from this up is a comfortable one to shoot at */
export const HIGH_ALTITUDE = 45

/** Under this best altitude an object doesn't really rise over the trees and the city glow */
export const RISES_ALTITUDE = 10

const DAY_MS = 86_400_000
const RAD = Math.PI / 180

// Categories whose objects move across the sky (comets, asteroids, planets, dwarf planets):
// their stored RA/Dec is the position on the shooting date, not where they are tonight
const MOVING_CATEGORIES = [8, 9, 10, 12]

export interface NightSample {
    time: Date
    /** Altitude of the Sun, degrees */
    sun: number
}

export interface Night {
    /** Local noon the night starts at */
    start: Date
    samples: NightSample[]
}

export type VisibilityLevel = 'high' | 'low' | 'none'

export interface Visibility {
    /** Best altitude during the dark hours, degrees (-90 when there are no dark hours) */
    altitude: number
    /** When the best altitude is reached */
    time?: Date
    level: VisibilityLevel
}

/**
 * Altitude of a point of the sky above the observer's horizon, degrees. A fast local sidereal
 * time formula: accurate to a fraction of a degree, plenty for "how high tonight".
 *
 * @param ra - Right ascension, degrees
 * @param dec - Declination, degrees
 */
export const getAltitude = (
    ra: number,
    dec: number,
    date: Date,
    lat: number = OBSERVATORY_LAT,
    lon: number = OBSERVATORY_LON
): number => {
    const days = date.getTime() / DAY_MS + 2440587.5 - 2451545
    const lst = (280.46061837 + 360.98564736629 * days + lon) % 360
    const hourAngle = (lst - ra) * RAD

    return (
        Math.asin(
            Math.sin(lat * RAD) * Math.sin(dec * RAD) + Math.cos(lat * RAD) * Math.cos(dec * RAD) * Math.cos(hourAngle)
        ) / RAD
    )
}

/**
 * The current night at the observatory: from the last local noon to the next one, sampled
 * every `stepMinutes` with the Sun's altitude.
 */
export const getNight = (
    now: Date = new Date(),
    stepMinutes: number = 10,
    lat: number = OBSERVATORY_LAT,
    lon: number = OBSERVATORY_LON
): Night => {
    const start = new Date(now)
    start.setUTCHours(LOCAL_NOON_UTC_HOUR, 0, 0, 0)

    if (now < start) {
        start.setUTCDate(start.getUTCDate() - 1)
    }

    const count = (24 * 60) / stepMinutes
    const samples: NightSample[] = []

    for (let i = 0; i <= count; i++) {
        const time = new Date(start.getTime() + i * stepMinutes * 60_000)
        samples.push({ time, sun: SunCalc.getPosition(time, lat, lon).altitude })
    }

    return { start, samples }
}

/** Position of a moment within the night, 0 (noon) … 1 (next noon) */
export const getNightPosition = (night: Night, date: Date): number =>
    Math.min(1, Math.max(0, (date.getTime() - night.start.getTime()) / DAY_MS))

/** Highest altitude of an object while it's dark during the given night */
export const getVisibility = (
    ra: number,
    dec: number,
    night: Night,
    lat: number = OBSERVATORY_LAT,
    lon: number = OBSERVATORY_LON
): Visibility => {
    let best: { altitude: number; time: Date } | undefined

    for (const { time, sun } of night.samples) {
        if (sun > DARK_SUN_ALTITUDE) {
            continue
        }

        const altitude = getAltitude(ra, dec, time, lat, lon)

        if (!best || altitude > best.altitude) {
            best = { altitude, time }
        }
    }

    if (!best) {
        return { altitude: -90, level: 'none' }
    }

    return {
        ...best,
        level: best.altitude >= HIGH_ALTITUDE ? 'high' : best.altitude >= VISIBLE_ALTITUDE ? 'low' : 'none'
    }
}

/** The observatory's calendar date (`YYYY-MM-DD`) of a moment: UTC's is a day behind until 05:00 */
export const getObservatoryDate = (date: Date): string =>
    new Date(date.getTime() + (12 - LOCAL_NOON_UTC_HOUR) * 3_600_000).toISOString().slice(0, 10)

/** Rises high enough tonight to be worth a look (not necessarily to shoot) */
export const risesTonight = (visibility?: Visibility | null): visibility is Visibility =>
    !!visibility && visibility.altitude >= RISES_ALTITUDE

/** Comets, asteroids and planets: the stored coordinates say nothing about tonight */
export const isMovingObject = (categories?: number[]): boolean =>
    !!categories?.some((id) => MOVING_CATEGORIES.includes(id))

/** Never sets below the horizon at this latitude */
export const isCircumpolar = (dec: number, lat: number = OBSERVATORY_LAT): boolean => dec > 90 - lat

/** Time of day at the observatory, "HH:mm" */
export const formatObservatoryTime = (date?: Date, locale: string = 'ru'): string =>
    date
        ? date.toLocaleTimeString(locale === 'en' ? 'en-GB' : 'ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Yekaterinburg'
          })
        : '—'
