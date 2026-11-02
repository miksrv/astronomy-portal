/**
 * Formats the given right ascension (RA) value into a string.
 *
 * @param {number} [ra] - The right ascension value in degrees.
 * @returns {string} The formatted right ascension as a string in the format "hh h mm m ss.ss s".
 */
export const formatRA = (ra?: number): string => {
    if (typeof ra !== 'number' || isNaN(ra) || typeof ra === 'undefined') {
        return ''
    }

    if (ra === 0) {
        return '0h 0m 0.00s'
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
    if (typeof dec !== 'number' || isNaN(dec) || typeof dec === 'undefined') {
        return ''
    }

    if (dec === 0) {
        return '+0° 0′ 0.00″'
    }

    const sign = dec < 0 ? '-' : '+'
    const absDec = Math.abs(dec)
    const degrees = Math.floor(absDec)
    const minutes = Math.floor((absDec - degrees) * 60)
    const seconds = ((absDec - degrees) * 60 - minutes) * 60
    return `${sign}${degrees}° ${minutes}′ ${seconds.toFixed(2)}″`
}

/**
 * Right ascension for people: "21ʰ 35ᵐ 55ˢ".
 *
 * @param {number} [ra] - The right ascension value in degrees.
 */
export const formatRAShort = (ra?: number): string => {
    if (typeof ra !== 'number' || Number.isNaN(ra)) {
        return ''
    }

    const totalSeconds = Math.round(((((ra % 360) + 360) % 360) / 15) * 3600) % 86_400
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours}ʰ ${String(minutes).padStart(2, '0')}ᵐ ${String(seconds).padStart(2, '0')}ˢ`
}

/**
 * Declination for people: "+57° 33′", with a true minus sign.
 *
 * @param {number} [dec] - The declination value in degrees.
 */
export const formatDECShort = (dec?: number): string => {
    if (typeof dec !== 'number' || Number.isNaN(dec)) {
        return ''
    }

    const totalMinutes = Math.round(Math.abs(dec) * 60)

    return `${dec < 0 && totalMinutes > 0 ? '−' : '+'}${Math.floor(totalMinutes / 60)}° ${String(totalMinutes % 60).padStart(2, '0')}′`
}
