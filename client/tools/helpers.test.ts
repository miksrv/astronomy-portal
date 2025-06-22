import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import {
    dateAddMonth,
    dateExtractMonth,
    declOfNum,
    formatDate,
    formatDateUTC,
    formatSecondsToExposure,
    // formatUTCDate,
    getTimeFromSec,
    isValidJSON,
    round,
    sliceText
} from './helpers'

dayjs.extend(utc)
dayjs.extend(timezone)

describe('helpers', () => {
    test('sliceText', () => {
        expect(sliceText('Hello World', 5)).toBe('Hello...')
        expect(sliceText('Hello', 10)).toBe('Hello')
    })

    test('declOfNum', () => {
        expect(declOfNum(1, ['кадр', 'кадра', 'кадров'])).toBe('кадр')
        expect(declOfNum(2, ['кадр', 'кадра', 'кадров'])).toBe('кадра')
        expect(declOfNum(5, ['кадр', 'кадра', 'кадров'])).toBe('кадров')
    })

    test('getTimeFromSec', () => {
        expect(getTimeFromSec(3661)).toBe('01:01')
        expect(getTimeFromSec(3661, true)).toBe('1 час 1 минута')
    })

    test('formatSecondsToExposure', () => {
        expect(formatSecondsToExposure(3661)).toBe('01:01')
        expect(formatSecondsToExposure(3661, true)).toBe('1 час 1 минута')
    })

    // test('formatUTCDate', () => {
    //     const date = new Date('2023-01-01T00:00:00Z')
    //     expect(formatUTCDate(date)).toBe(dayjs.utc(date).local().format('D MMMM YYYY, HH:mm'))
    // })

    test('formatDate', () => {
        const date = new Date('2023-01-01T00:00:00Z')
        expect(formatDate(date)).toBe(dayjs(date).format('DD.MM.YYYY, HH:mm'))
    })

    test('formatDateUTC', () => {
        const date = new Date('2023-01-01T00:00:00Z')
        expect(formatDateUTC(date)).toBe(dayjs.utc(date).local().format('D MMMM YYYY, HH:mm'))
    })

    test('dateExtractMonth', () => {
        const date = new Date('2023-01-01T00:00:00Z')
        expect(dateExtractMonth(date, 1)).toEqual(dayjs(date).subtract(1, 'month').toDate())
    })

    test('dateAddMonth', () => {
        const date = new Date('2023-01-01T00:00:00Z')
        expect(dateAddMonth(date, 1)).toEqual(dayjs(date).add(1, 'month').toDate())
    })

    test('isValidJSON', () => {
        expect(isValidJSON('{"key": "value"}')).toBe(true)
        expect(isValidJSON('invalid json')).toBe(false)
    })

    test('round', () => {
        expect(round(1.23456)).toBe(1.2346)
        expect(round(1.23456, 2)).toBe(1.23)
    })
})
