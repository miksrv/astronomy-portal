import * as SunCalc from 'suncalc'

import { OBSERVATORY_LAT, OBSERVATORY_LON } from '@/utils/visibility'

export type SkyPhase = 'day' | 'twilight' | 'night'

/** Day, twilight (the Sun 0…−18°) or astronomical night */
export const getSkyPhase = (sunAltitude: number): SkyPhase =>
    sunAltitude > 0 ? 'day' : sunAltitude > -18 ? 'twilight' : 'night'

export interface SkyState {
    sun: { altitude: number; azimuth: number; rise?: Date | null; set?: Date | null }
    moon: { altitude: number; fraction: number; phase: number; rise?: Date; set?: Date }
}

/** The Sun and the Moon over the observatory at a moment */
export const getSkyState = (now: Date): SkyState => {
    const sun = SunCalc.getPosition(now, OBSERVATORY_LAT, OBSERVATORY_LON)
    const moon = SunCalc.getMoonPosition(now, OBSERVATORY_LAT, OBSERVATORY_LON)
    const illumination = SunCalc.getMoonIllumination(now)
    // Rise and set times of the observatory's civil day (UTC+5)
    const sunTimes = SunCalc.getTimes(now, OBSERVATORY_LAT, OBSERVATORY_LON, 0, 300)
    const moonTimes = SunCalc.getMoonTimes(now, OBSERVATORY_LAT, OBSERVATORY_LON, 300)

    return {
        sun: { altitude: sun.altitude, azimuth: sun.azimuth, rise: sunTimes.sunrise, set: sunTimes.sunset },
        moon: {
            altitude: moon.altitude,
            fraction: illumination.fraction,
            phase: illumination.phase,
            rise: moonTimes.rise,
            set: moonTimes.set
        }
    }
}

/** The night as runs of day / twilight / night, each with its share of the 24 hours */
export const getSkyTimeline = (samples: Array<{ sun: number }>): Array<{ phase: SkyPhase; share: number }> => {
    const runs: Array<{ phase: SkyPhase; count: number }> = []

    samples.forEach(({ sun }) => {
        const phase = getSkyPhase(sun)
        const last = runs[runs.length - 1]

        if (last?.phase === phase) {
            last.count++
        } else {
            runs.push({ phase, count: 1 })
        }
    })

    return runs.map(({ phase, count }) => ({ phase, share: count / samples.length }))
}
