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

// What separates the parts of a sexagesimal coordinate: "13:29:53", "13h 29m 53s", "47° 11′ 43″"
const SEPARATORS = /[\s:hmsdʰᵐˢ°′″'"]+/i

/** The numbers of "13 29 53.2" (at most three), or undefined when it isn't that */
const splitSexagesimal = (text: string): number[] | undefined => {
    const parts = text.split(SEPARATORS).filter(Boolean)

    if (!parts.length || parts.length > 3 || parts.some((part) => !/^\d+(\.\d+)?$/.test(part))) {
        return undefined
    }

    const numbers = parts.map(Number)

    // Minutes and seconds are below 60
    return numbers.slice(1).some((value) => value >= 60) ? undefined : numbers
}

const normalize = (text: string): string => text.trim().replace(/,/g, '.').replace(/−/g, '-')

/**
 * Right ascension as an editor types it, in degrees: `202.47` (degrees) or the hours of an
 * atlas — `13:29:53`, `13h 29m 53s`, `13ʰ 29ᵐ 53ˢ`. Undefined when it can't be read.
 */
export const parseRA = (text: string): number | undefined => {
    const value = normalize(text)

    if (!value) {
        return undefined
    }

    if (/^\d+(\.\d+)?$/.test(value)) {
        return Number(value)
    }

    const parts = splitSexagesimal(value)

    if (!parts) {
        return undefined
    }

    const [hours = 0, minutes = 0, seconds = 0] = parts

    return (hours + minutes / 60 + seconds / 3600) * 15
}

/**
 * Declination as an editor types it, in degrees: `47.195`, `-12.5` or `+47:11:43`,
 * `47° 11′ 43″`, `-05 23 28`. Undefined when it can't be read.
 */
export const parseDec = (text: string): number | undefined => {
    const value = normalize(text)

    if (!value) {
        return undefined
    }

    const sign = value.startsWith('-') ? -1 : 1
    const unsigned = value.replace(/^[+-]\s*/, '')

    if (/^\d+(\.\d+)?$/.test(unsigned)) {
        return sign * Number(unsigned)
    }

    const parts = splitSexagesimal(unsigned)

    if (!parts) {
        return undefined
    }

    const [degrees = 0, minutes = 0, seconds = 0] = parts

    return sign * (degrees + minutes / 60 + seconds / 3600)
}

/** A stored coordinate as the text of its field: degrees, without float noise */
export const coordinateToText = (value?: number | null): string =>
    typeof value === 'number' && Number.isFinite(value) ? String(Number(value.toFixed(6))) : ''
