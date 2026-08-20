import SunCalc from 'suncalc'

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
    const sunPosition = SunCalc.getPosition(now, LAT, LON)
    const moonPosition = SunCalc.getMoonPosition(now, LAT, LON)

    return {
        currentDate: now,
        moonAltitude: ((moonPosition.altitude * 180) / Math.PI).toFixed(0),
        moonAzimuth: ((moonPosition.azimuth * 180) / Math.PI).toFixed(0),
        moonTimes: SunCalc.getMoonTimes(now, LAT, LON),
        sunAltitude: ((sunPosition.altitude * 180) / Math.PI).toFixed(0),
        sunAzimuth: ((sunPosition.azimuth * 180) / Math.PI).toFixed(0),
        sunTimes: SunCalc.getTimes(now, LAT, LON)
    }
}
