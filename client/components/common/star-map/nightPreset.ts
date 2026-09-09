import * as Astronomy from 'astronomy-engine'

/**
 * "Tonight" preset for the star map's date control: the next moment after `from`
 * when the sky is dark at the observer's place. Pure astronomy-engine math, no
 * d3-celestial involved (Business Rule 10 of features/star-atlas-upgrade.md).
 */

/** Sun altitudes tried in order: astronomical dusk, then nautical, then civil (white nights) */
export const NIGHT_SUN_ALTITUDES = [-18, -12, -6] as const

/** How far ahead a dusk is searched for each altitude, in days */
const SEARCH_LIMIT_DAYS = 2

/** If the coming dawn is closer than this, "tonight" means the *next* night, not the last hour of this one */
const MIN_REMAINING_NIGHT_MS = 60 * 60 * 1000

/**
 * Sun altitude (degrees) at an instant for an observer. Refraction-free on purpose:
 * twilight thresholds are conventionally uncorrected and SearchAltitude searches
 * without refraction too — mixing the two would put the "already night" check ~0.6°
 * off the value the search converges to.
 */
export const sunAltitude = (observer: Astronomy.Observer, date: Date): number => {
    const equator = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true)

    return Astronomy.Horizon(date, observer, equator.ra, equator.dec).altitude
}

/**
 * Next moment the Sun drops below `altitude` after `from`; `from` itself when it is
 * already below and stays there for at least an hour. Null when it never happens
 * within the search window (polar day / white nights for that threshold).
 */
const findDusk = (observer: Astronomy.Observer, from: Date, altitude: number): Date | null => {
    if (sunAltitude(observer, from) <= altitude) {
        const dawn = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, +1, from, SEARCH_LIMIT_DAYS, altitude)

        if (!dawn || dawn.date.getTime() - from.getTime() > MIN_REMAINING_NIGHT_MS) {
            return from
        }

        // Dawn is imminent — look for the dusk that follows it
        return (
            Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, dawn.date, SEARCH_LIMIT_DAYS, altitude)?.date ??
            null
        )
    }

    return Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, from, SEARCH_LIMIT_DAYS, altitude)?.date ?? null
}

/**
 * The instant to jump to for "tonight": end of astronomical twilight after `from`,
 * degrading to nautical and then civil twilight where the Sun never gets that low
 * (white nights). Null when even civil twilight never comes (polar day).
 */
export const findTonightMoment = (geopos: [number, number], from: Date): Date | null => {
    const observer = new Astronomy.Observer(geopos[0], geopos[1], 0)

    for (const altitude of NIGHT_SUN_ALTITUDES) {
        const moment = findDusk(observer, from, altitude)

        if (moment) {
            return moment
        }
    }

    return null
}
