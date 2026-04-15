import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
    it('returns undefined for null/undefined input', () => {
        expect(getErrorMessage(null)).toBeUndefined()
        expect(getErrorMessage(undefined)).toBeUndefined()
    })

    it('returns messages.error when present', () => {
        expect(getErrorMessage({ messages: { error: 'Something went wrong' } })).toBe('Something went wrong')
    })

    it('falls back to first value when no error key', () => {
        expect(getErrorMessage({ messages: { name: 'Name is required' } })).toBe('Name is required')
    })

    it('returns undefined for empty messages', () => {
        expect(getErrorMessage({ messages: {} })).toBeUndefined()
    })
})
