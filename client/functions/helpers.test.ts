import {
    getTimeFromSec,
    isOutdated,
    range,
    shuffle,
    sliceText,
    timeAgo
} from './helpers'

describe('helpers', () => {
    describe('range function', () => {
        it('generates an array of numbers with a step', () => {
            expect(range(1, 5, 2)).toEqual([1, 3, 5])
        })

        it('generates an array of numbers with a default step of 1', () => {
            expect(range(1, 5)).toEqual([1, 2, 3, 4, 5])
        })
    })

    describe('sliceText function', () => {
        it('truncates text to the specified length', () => {
            const text = 'This is a long text that needs to be truncated.'
            const sliced = sliceText(text, 10)
            expect(sliced).toBe('This is a ...')
        })

        it('does not add ellipsis if text is not truncated', () => {
            const text = 'Short text'
            const sliced = sliceText(text, 20)
            expect(sliced).toBe('Short text')
        })
    })

    describe('isOutdated function', () => {
        it('returns true when date1 is less than date2', () => {
            const date1 = '2023-01-01'
            const date2 = '2023-02-01'
            expect(isOutdated(date1, date2)).toBe(true)
        })

        it('returns false when date1 is greater than date2', () => {
            const date1 = '2023-02-01'
            const date2 = '2023-01-01'
            expect(isOutdated(date1, date2)).toBe(false)
        })
    })

    describe('getTimeFromSec function', () => {
        it('converts seconds to HH:mm format', () => {
            const seconds = 3660 // 1 hour and 1 minute
            expect(getTimeFromSec(seconds)).toBe('01:01')
        })

        it('converts seconds to full format', () => {
            const seconds = 7260 // 2 hours and 1 minute
            expect(getTimeFromSec(seconds, true)).toBe('2 часа 1 минута')
        })
    })

    describe('timeAgo function', () => {
        it('returns "обновлено недавно" for null or non-positive seconds', () => {
            expect(timeAgo(null)).toBe('обновлено недавно')
            expect(timeAgo(0)).toBe('обновлено недавно')
            expect(timeAgo(-5)).toBe('обновлено недавно')
        })

        it('converts seconds to "H ч. M м. S с. назад" format', () => {
            const seconds = 3665 // 1 hour, 1 minute, and 5 seconds
            expect(timeAgo(seconds)).toBe('01 ч. 01 м. 05 с. назад')
        })
    })

    describe('shuffle function', () => {
        it('returns an array with the same length', () => {
            const inputArray = [1, 2, 3, 4, 5]
            const outputArray = shuffle(inputArray)
            expect(outputArray).toHaveLength(inputArray.length)
        })

        it('returns an array with the same elements', () => {
            const inputArray = [1, 2, 3, 4, 5]
            const outputArray = shuffle(inputArray)
            inputArray.forEach((item) => {
                expect(outputArray).toContain(item)
            })
        })
    })
})
