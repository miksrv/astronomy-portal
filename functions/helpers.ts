import moment from 'moment'

export const declOfNum = (number: number, words: string[]) => {
    return words[
        number % 100 > 4 && number % 100 < 20
            ? 2
            : [2, 0, 1, 1, 1, 2][number % 10 < 5 ? number % 10 : 5]
    ]
}

export const isOutdated = (date1: string, date2: string) =>
    moment(date1).diff(moment(date2)) < 0

/**
 * Returns the formatted time elapsed since the beginning of the event
 * @param sec {number}
 * @param full {boolean}
 * @returns {string}
 */
export const getTimeFromSec = (sec: number, full: boolean = false): string => {
    if (sec <= 0) return ''

    let h = (sec / 3600) ^ 0
    let m = ((sec - h * 3600) / 60) ^ 0

    if (full)
        return `${h} ${declOfNum(h, ["час", "часа", "часов"])} ${m} ${declOfNum(
            m,
            ["минута", "минуты", "минут"]
        )}`

    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m)
}

export const timeAgo = (sec: number) => {
    if (sec === null || sec <= 0) return "обновлено недавно"

    let h = (sec / 3600) ^ 0
    let m = ((sec - h * 3600) / 60) ^ 0
    let s = sec - h * 3600 - m * 60

    return (
        (h > 0 ? (h < 10 ? '0' + h : h) + ` ч. ` : '') +
        (m > 0 ? (m < 10 ? '0' + m : m) + ` м. ` : '') +
        (s > 0 ? (s < 10 ? '0' + s : s) + ` с.` : '') +
        ` назад`
    )
}

/**
 * Shuffles the array randomly
 * @param array
 * @returns {array}
 */
export const shuffle = (array: any[]) => {
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
