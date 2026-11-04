import { splitAge } from './utils'

describe('splitAge', () => {
    it('picks minutes, then hours, then days', () => {
        expect(splitAge(0)).toStrictEqual({ unit: 'minutes', count: 0 })
        expect(splitAge(59)).toStrictEqual({ unit: 'minutes', count: 59 })
        expect(splitAge(60)).toStrictEqual({ unit: 'hours', count: 1 })
        expect(splitAge(1439)).toStrictEqual({ unit: 'hours', count: 23 })
        expect(splitAge(4320)).toStrictEqual({ unit: 'days', count: 3 })
    })
})
