/**
 * Formats the given right ascension (RA) value into a string.
 *
 * @param {number} [ra] - The right ascension value in degrees.
 * @returns {string} The formatted right ascension as a string in the format "hh h mm m ss.ss s".
 */
export const formatRA = (ra?: number): string => {
    if (!ra) {
        return ''
    }

    const hours = Math.floor(ra / 15)
    const minutes = Math.floor((ra / 15 - hours) * 60)
    const seconds = ((ra / 15 - hours) * 60 - minutes) * 60

    return `${hours}h ${minutes}m ${seconds.toFixed(2)}s`
}

/**
 * Formats the given declination (DEC) value into a string.
 *
 * @param {number} [dec] - The declination value in degrees.
 * @returns {string} The formatted declination as a string in the format "+/-dd° mm′ ss.ss″".
 */
export const formatDEC = (dec?: number): string => {
    if (!dec) {
        return ''
    }

    const sign = dec < 0 ? '-' : '+'
    const absDec = Math.abs(dec)
    const degrees = Math.floor(absDec)
    const minutes = Math.floor((absDec - degrees) * 60)
    const seconds = ((absDec - degrees) * 60 - minutes) * 60
    return `${sign}${degrees}° ${minutes}′ ${seconds.toFixed(2)}″`
}
