import * as Astronomy from 'astronomy-engine'
import { AstroTime, Observer } from 'astronomy-engine'

/**
 * Calculates various sun events (rise, set, and twilight phases) for a given observer and time.
 *
 * @param {Observer} observer - The observer's location.
 * @param {AstroTime} time - The time at which to calculate the sun events.
 * @returns {Object} An object containing the times of various sun events.
 */
export const makeSunEvents = (observer: Observer, time: AstroTime) => {
    const sun = Astronomy.Body.Sun

    return {
        rise: Astronomy.SearchRiseSet(sun, observer, 1, time, 1),
        set: Astronomy.SearchRiseSet(sun, observer, -1, time, 1),
        civilDawn: Astronomy.SearchAltitude(sun, observer, 1, time, 1, -6),
        nauticalDawn: Astronomy.SearchAltitude(sun, observer, 1, time, 1, -12),
        astroDawn: Astronomy.SearchAltitude(sun, observer, 1, time, 1, -18),
        astroDusk: Astronomy.SearchAltitude(sun, observer, -1, time, 1, -18),
        nauticalDusk: Astronomy.SearchAltitude(sun, observer, -1, time, 1, -12),
        civilDusk: Astronomy.SearchAltitude(sun, observer, -1, time, 1, -6)
    }
}
