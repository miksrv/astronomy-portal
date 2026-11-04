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
