import * as SunCalc from 'suncalc'

import { LAT, LON } from './constants'

export type AstroData = {
    sunAltitude: string
    sunAzimuth: string
    moonAltitude: string
    moonAzimuth: string
    sunTimes: ReturnType<typeof SunCalc.getTimes>
    moonTimes: ReturnType<typeof SunCalc.getMoonTimes>
    currentDate: Date
}

export const computeAstroData = (): AstroData => {
    const now = new Date()
    // suncalc 2 returns degrees, azimuth clockwise from north
    const sunPosition = SunCalc.getPosition(now, LAT, LON)
    const moonPosition = SunCalc.getMoonPosition(now, LAT, LON)
    // Sun and Moon rise/set for the visitor's civil day (without the offset suncalc 2 picks
    // the solar day nearest `now`, which is yesterday's shortly after midnight east of UTC+4)
    const utcOffset = -now.getTimezoneOffset()

    return {
        currentDate: now,
        moonAltitude: moonPosition.altitude.toFixed(0),
        moonAzimuth: moonPosition.azimuth.toFixed(0),
        moonTimes: SunCalc.getMoonTimes(now, LAT, LON, utcOffset),
        sunAltitude: sunPosition.altitude.toFixed(0),
        sunAzimuth: sunPosition.azimuth.toFixed(0),
        sunTimes: SunCalc.getTimes(now, LAT, LON, 0, utcOffset)
    }
}
