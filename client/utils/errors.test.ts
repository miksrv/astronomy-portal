import { getErrorMessage, getFieldErrors } from './errors'

describe('getErrorMessage', () => {
    it('returns undefined for null/undefined input', () => {
        expect(getErrorMessage(null)).toBeUndefined()
        expect(getErrorMessage(undefined)).toBeUndefined()
    })

    it('returns the message field', () => {
        expect(getErrorMessage({ message: 'Something went wrong' })).toBe('Something went wrong')
    })

    it('returns the message field even when field errors are also present', () => {
        expect(
            getErrorMessage({
                message: 'Проверьте правильность заполнения полей.',
                errors: { name: 'Обязательное поле' }
            })
        ).toBe('Проверьте правильность заполнения полей.')
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
                message: 'Проверьте правильность заполнения полей.',
                errors: { title: 'Обязательное поле', tickets: 'Должно быть больше 0' }
            })
        ).toEqual({ title: 'Обязательное поле', tickets: 'Должно быть больше 0' })
    })

    it('returns an empty object when there are no field errors', () => {
        expect(getFieldErrors({ message: 'Некорректная дата' })).toEqual({})
    })
})
