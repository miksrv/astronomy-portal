import { getErrorMessage, getFieldErrors } from './errors'

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

describe('getFieldErrors', () => {
    it('returns an empty object for null/undefined input', () => {
        expect(getFieldErrors(null)).toEqual({})
        expect(getFieldErrors(undefined)).toEqual({})
    })

    it('returns the per-field messages, keyed by field name', () => {
        expect(
            getFieldErrors({
                messages: { title: 'Обязательное поле', tickets: 'Должно быть больше 0' }
            })
        ).toEqual({ title: 'Обязательное поле', tickets: 'Должно быть больше 0' })
    })

    it('excludes the generic "error" key, which has no single field to attach to', () => {
        expect(
            getFieldErrors({
                messages: { error: 'Некорректная дата', registrationEnd: 'ignored-by-this-case' }
            })
        ).toEqual({ registrationEnd: 'ignored-by-this-case' })
    })

    it('returns an empty object when there are no messages', () => {
        expect(getFieldErrors({ messages: {} })).toEqual({})
    })
})
