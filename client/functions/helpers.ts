import dayjs, { Dayjs } from 'dayjs'

export const concatClassNames = (
    ...args: Array<string | boolean | null | undefined>
): string => args.filter((item) => !!item).join(' ')

/**
 * Generates an array of numbers in a certain range and with a given step
 * @param from
 * @param to
 * @param step
 */
export const range = (from: number, to: number, step = 1) => {
    let i = from
    const range: number[] = []

    while (i <= to) {
        range.push(i)
        i += step
    }

    return range
}

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
 * Compares two dates and returns TRUE if the first date is less than the second
 * @param date1
 * @param date2
 */
export const isOutdated = (date1: string, date2: string) =>
    dayjs(date1).diff(dayjs(date2)) <= 0

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

export const formatUTCDate = (
    date?: string | Date,
    format: string = 'D MMMM YYYY, HH:mm'
): string => (date ? dayjs.utc(date).local().format(format) : '')

export const isUTCOutdated = (date: string) =>
    dayjs.utc(date).local().diff(dayjs()) >= 0

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

export const formatTimestamp = (
    timestamp: number | undefined,
    format?: string
): string | undefined =>
    timestamp ? formatDate(dayjs.unix(timestamp), format) : undefined

export const dateExtractMonth = (
    date: string | Date | Dayjs,
    monthCount: number
): Date => dayjs(date).subtract(monthCount, 'month').toDate()

export const dateAddMonth = (
    date: string | Date | Dayjs,
    monthCount: number
): Date => dayjs(date).add(monthCount, 'month').toDate()

export const timeAgo = (seconds?: number | string): string => {
    if (typeof seconds === 'undefined') return ''

    let sec = Number(seconds)

    if (sec <= 0) return 'обновлено недавно'

    let h = (sec / 3600) ^ 0
    let m = ((sec - h * 3600) / 60) ^ 0
    let s = sec - h * 3600 - m * 60

    return (
        (h > 0 ? (h < 10 ? '0' + h : h) + ' ч. ' : '') +
        (m > 0 ? (m < 10 ? '0' + m : m) + ' м. ' : '') +
        (s > 0 ? (s < 10 ? '0' + s : s) + ' с.' : '') +
        ' назад'
    )
}

/**
 * Shuffles the array randomly
 * @param array
 * @returns {array}
 */
export const shuffle = (array: any[]): any[] => {
    let currentIndex: number = array.length
    let temporaryValue
    let randomIndex

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex -= 1

        temporaryValue = array[currentIndex]
        array[currentIndex] = array[randomIndex]
        array[randomIndex] = temporaryValue
    }

    return array
}
