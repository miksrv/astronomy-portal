import SunCalc from 'suncalc'

/**
 * Returns the moon phase for a given date.
 * @param {Date} date - The date for which to calculate the moon phase.
 * @returns {number} The moon phase, rounded to the nearest eighth.
 */
export const getMoonPhase = (date: Date): number => {
    const illumination = SunCalc.getMoonIllumination(date)
    return Math.round(illumination.phase * 8) / 8
}

/**
 * Returns the moon illumination for a given date.
 * @param {Date} date - The date for which to calculate the moon illumination.
 * @returns {number} The moon illumination as a percentage.
 */
export const getMoonIllumination = (date: Date): number => {
    const illumination = SunCalc.getMoonIllumination(date)
    return illumination.fraction * 100
}
