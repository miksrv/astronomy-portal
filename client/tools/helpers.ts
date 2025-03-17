import dayjs, { Dayjs } from 'dayjs'

/**
 * Returns abbreviated text up to the specified length.
 * If the text is truncated (more than the specified length) - adds an ellipsis at the end
 * @param text
 * @param length
 */
export const sliceText = (text: string, length: number = 350): string => {
    let sliced = text.replace(/(\r\n|\n|\r)/gm, '').slice(0, length)

    return sliced + (sliced.length < text.length ? '...' : '')
}

/**
 * Returns the correct word for plural
 * Example: declOfNum(5, ['кадр', 'кадра', 'кадров']) = '5 кадров'
 * @param number
 * @param words
 */
export const declOfNum = (number: number, words: string[]) =>
    words[
        number % 100 > 4 && number % 100 < 20
            ? 2
            : [2, 0, 1, 1, 1, 2][number % 10 < 5 ? number % 10 : 5]
    ]

/**
 * Returns the formatted time elapsed since the beginning of the event
 * @param sec {number}
 * @param full {boolean}
 * @returns {string}
 */
export const getTimeFromSec = (sec: number, full: boolean = false): string => {
    if (sec <= 0) return '0'

    let h = (sec / 3600) ^ 0
    let m = ((sec - h * 3600) / 60) ^ 0

    if (full) {
        let text = ''

        text += h ? h + ' ' + declOfNum(h, ['час', 'часа', 'часов']) + ' ' : ''
        text += m ? m + ' ' + declOfNum(m, ['минута', 'минуты', 'минут']) : ''

        return text
    }

    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m)
}

export const formatSecondsToExposure = (
    sec: number | string,
    full: boolean = false
): string => {
    const seconds = Number(sec)

    if (seconds <= 0) return '0'

    let h = (seconds / 3600) ^ 0
    let m = ((seconds - h * 3600) / 60) ^ 0

    if (full) {
        let text = ''

        text += h ? h + ' ' + declOfNum(h, ['час', 'часа', 'часов']) + ' ' : ''
        text += m ? m + ' ' + declOfNum(m, ['минута', 'минуты', 'минут']) : ''

        return text
    }

    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m)
}

export const formatUTCDate = (
    date?: string | Date,
    format: string = 'D MMMM YYYY, HH:mm'
): string => (date ? dayjs.utc(date).local().format(format) : '')

/**
 * @param date
 * @param format
 */
export const formatDate = (
    date?: string | Date | Dayjs,
    format?: string
): string | undefined =>
    date ? dayjs(date).format(format ?? 'DD.MM.YYYY, HH:mm') : undefined

export const formatDateUTC = (
    date?: string | Date,
    format: string = 'D MMMM YYYY, HH:mm'
): string => (date ? dayjs.utc(date).local().format(format) : '')

export const minutesAgo = (
    date?: string | Date,
    withoutSuffix?: boolean
): string => (date ? dayjs.utc(date).fromNow(withoutSuffix) : '')

export const dateExtractMonth = (
    date: string | Date | Dayjs,
    monthCount: number
): Date => dayjs(date).subtract(monthCount, 'month').toDate()

export const dateAddMonth = (
    date: string | Date | Dayjs,
    monthCount: number
): Date => dayjs(date).add(monthCount, 'month').toDate()

export const isValidJSON = (string: string) => {
    if (!string || !string.length) {
        return true
    }

    try {
        JSON.parse(string)
    } catch (e) {
        console.error(e)

        return false
    }

    return true
}

/**
 * Rounds a number to a specified number of digits.
 *
 * @param value - The number to be rounded.
 * @param digits - The number of digits to round to. Defaults to 4.
 * @returns The rounded number or undefined if the value is undefined.
 */
export const round = (value?: number, digits: number = 4): number | undefined =>
    value ? Number(value.toFixed(digits)) : undefined
