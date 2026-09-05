import * as Astronomy from 'astronomy-engine'
import SunCalc from 'suncalc'

import { getMoonIllumination, getMoonPhase } from '@/utils/moon'

/**
 * Astronomy data for the click-to-inspect info panel (FE-8 of
 * features/star-atlas-upgrade.md). Everything here is computed independently of
 * d3-celestial (Business Rule 10) from the object's RA/Dec plus the selected
 * location + date, via the project's existing astronomy-engine/suncalc stack.
 */

export type CelestialObjectKind = 'star' | 'dso' | 'planet' | 'sun' | 'moon' | 'radiant'

export type ObjectInfoData = {
    kind: CelestialObjectKind
    name: string
    /** Secondary designation shown under the name, e.g. 'HIP 91262' or 'NGC 224' */
    designation?: string
    magnitude?: number
    /** J2000 right ascension in degrees [0..360) */
    ra: number
    /** J2000 declination in degrees */
    dec: number
    /** Degrees above the horizon at the selected moment/location (negative = below) */
    altitude: number
    /** Degrees from north, eastward */
    azimuth: number
    /** Next rise/set (moon/sun: SunCalc for the selected day; may be absent in polar cases) */
    rise?: Date
    set?: Date
    /** Moon only: phase [0..1] (0/1 = new, 0.5 = full) and illuminated fraction in % */
    moonPhase?: number
    moonIllumination?: number
    /** Moon only: distance in km */
    moonDistanceKm?: number
    /** Planets only: illuminated fraction in % and distance from Earth in AU */
    phaseFraction?: number
    distanceAu?: number
    /** Radiants only */
    peak?: string
    activeFrom?: string
    activeTo?: string
    isActive?: boolean
}

const normalizeRa = (raDegrees: number): number => ((raDegrees % 360) + 360) % 360

const COMPASS_KEYS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const

export type CompassKey = (typeof COMPASS_KEYS)[number]

/** Nearest compass point for an azimuth (degrees from north, eastward) — e.g. 182° → 's'. */
export const azimuthToCompassKey = (azimuth: number): CompassKey =>
    COMPASS_KEYS[Math.round((((azimuth % 360) + 360) % 360) / 45) % COMPASS_KEYS.length] as CompassKey

/**
 * J2000 RA/Dec (degrees) → altitude/azimuth (degrees) for an observer and instant.
 * Uses the EQJ→HOR rotation (not Astronomy.Horizon, which expects equator-of-date
 * coordinates — feeding it the catalogs' J2000 values would be off by precession).
 */
export const equatorialToHorizontal = (
    raDegrees: number,
    dec: number,
    geopos: [number, number],
    date: Date
): { altitude: number; azimuth: number } => {
    const time = Astronomy.MakeTime(date)
    const observer = new Astronomy.Observer(geopos[0], geopos[1], 0)
    const vector = Astronomy.VectorFromSphere(new Astronomy.Spherical(dec, normalizeRa(raDegrees), 1), time)
    const rotation = Astronomy.Rotation_EQJ_HOR(time, observer)
    const horizontal = Astronomy.HorizonFromVector(Astronomy.RotateVector(rotation, vector), 'normal')

    return { altitude: horizontal.lat, azimuth: horizontal.lon }
}

/**
 * Azimuth/altitude (degrees) → J2000 RA/Dec (degrees, RA in [-180, 180) as the
 * d3-celestial data files use). Used to pin compass labels and the ground silhouette
 * to the horizon — Celestial.mapProjection() expects equatorial coordinates.
 */
export const horizontalToEquatorial = (
    azimuth: number,
    altitude: number,
    geopos: [number, number],
    date: Date
): [number, number] => {
    const time = Astronomy.MakeTime(date)
    const observer = new Astronomy.Observer(geopos[0], geopos[1], 0)
    const vector = Astronomy.VectorFromHorizon(new Astronomy.Spherical(altitude, azimuth, 1), time, 'normal')
    const rotation = Astronomy.Rotation_HOR_EQJ(time, observer)
    const equatorial = Astronomy.EquatorFromVector(Astronomy.RotateVector(rotation, vector))

    let ra = equatorial.ra * 15
    if (ra > 180) {
        ra -= 360
    }

    return [ra, equatorial.dec]
}

const PLANET_BODIES = [
    Astronomy.Body.Mercury,
    Astronomy.Body.Venus,
    Astronomy.Body.Mars,
    Astronomy.Body.Jupiter,
    Astronomy.Body.Saturn,
    Astronomy.Body.Uranus,
    Astronomy.Body.Neptune
] as const

export type BodyPosition = {
    body: Astronomy.Body
    kind: CelestialObjectKind
    /** J2000 RA in degrees [0..360) */
    ra: number
    dec: number
}

/** Current J2000 positions of the Sun, Moon and planets — for hit-testing and search. */
export const getBodyPositions = (geopos: [number, number], date: Date): BodyPosition[] => {
    const observer = new Astronomy.Observer(geopos[0], geopos[1], 0)

    return [Astronomy.Body.Sun, Astronomy.Body.Moon, ...PLANET_BODIES].map((body) => {
        const equatorial = Astronomy.Equator(body, date, observer, false, true)

        return {
            body,
            kind: body === Astronomy.Body.Sun ? 'sun' : body === Astronomy.Body.Moon ? 'moon' : 'planet',
            ra: equatorial.ra * 15,
            dec: equatorial.dec
        } as BodyPosition
    })
}

/** Info panel data for a fixed-position object (star, DSO, meteor radiant, portal object). */
export const computeFixedObjectInfo = (
    input: {
        kind: CelestialObjectKind
        name: string
        designation?: string
        magnitude?: number
        ra: number
        dec: number
    },
    geopos: [number, number],
    date: Date
): ObjectInfoData => ({
    ...input,
    ra: normalizeRa(input.ra),
    ...equatorialToHorizontal(input.ra, input.dec, geopos, date)
})

/** Info panel data for a solar-system body (Sun, Moon or a planet). */
export const computeBodyInfo = (
    body: Astronomy.Body,
    name: string,
    geopos: [number, number],
    date: Date
): ObjectInfoData => {
    const [lat, lon] = geopos
    const observer = new Astronomy.Observer(lat, lon, 0)
    const equatorial = Astronomy.Equator(body, date, observer, false, true)
    const raDegrees = equatorial.ra * 15

    const base: ObjectInfoData = {
        kind: body === Astronomy.Body.Sun ? 'sun' : body === Astronomy.Body.Moon ? 'moon' : 'planet',
        name,
        ra: normalizeRa(raDegrees),
        dec: equatorial.dec,
        ...equatorialToHorizontal(raDegrees, equatorial.dec, geopos, date)
    }

    if (body === Astronomy.Body.Moon) {
        const moonTimes = SunCalc.getMoonTimes(date, lat, lon)

        return {
            ...base,
            moonPhase: getMoonPhase(date),
            moonIllumination: getMoonIllumination(date),
            moonDistanceKm: SunCalc.getMoonPosition(date, lat, lon).distance,
            rise: moonTimes.rise || undefined,
            set: moonTimes.set || undefined
        }
    }

    if (body === Astronomy.Body.Sun) {
        const sunTimes = SunCalc.getTimes(date, lat, lon)

        return {
            ...base,
            rise: Number.isNaN(sunTimes.sunrise?.getTime()) ? undefined : sunTimes.sunrise,
            set: Number.isNaN(sunTimes.sunset?.getTime()) ? undefined : sunTimes.sunset
        }
    }

    const illumination = Astronomy.Illumination(body, date)

    return {
        ...base,
        magnitude: Math.round(illumination.mag * 100) / 100,
        phaseFraction: illumination.phase_fraction * 100,
        distanceAu: illumination.geo_dist
    }
}
