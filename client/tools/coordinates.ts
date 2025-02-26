/**
 * Converts decimal degrees to a string in either hours, minutes, and seconds (HMS) format
 * or degrees, minutes, and seconds (DMS) format.
 *
 * @param {number} degrees - The decimal degrees to convert.
 * @param {boolean} [isRA=false] - If true, converts to HMS format (used for Right Ascension).
 *                                 If false, converts to DMS format (used for Declination).
 * @returns {string} The formatted string in HMS or DMS format.
 */
export const decimalToHMS = (
    degrees?: number,
    isRA: boolean = false
): string => {
    if (!degrees) {
        return ''
    }

    const absDeg = Math.abs(degrees)
    const hoursOrDeg = isRA ? absDeg / 15 : Math.floor(absDeg)
    const minutes = Math.floor((hoursOrDeg - Math.floor(hoursOrDeg)) * 60)
    const seconds = ((hoursOrDeg - Math.floor(hoursOrDeg)) * 60 - minutes) * 60

    const sign = degrees < 0 ? '-' : ''
    return isRA
        ? `${Math.floor(hoursOrDeg)}h ${minutes}m ${seconds.toFixed(2)}s`
        : `${sign}${Math.floor(hoursOrDeg)}° ${minutes}′ ${seconds.toFixed(2)}″`
}
