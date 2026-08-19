import { ApiType } from '@/api'

/**
 * Extracts a human-readable error message from an RTK Query error response.
 *
 * The backend returns errors as { messages: Record<string, string> }.
 * Business logic errors use the key 'error'; validation errors use field names.
 * This helper returns messages.error first, then falls back to the first value.
 */
export const getErrorMessage = (error: unknown): string | undefined => {
    const resError = error as ApiType.ResError
    if (!resError?.messages) {
        return undefined
    }
    return resError.messages['error'] ?? Object.values(resError.messages)[0]
}

/**
 * Extracts per-field validation messages from an RTK Query error response,
 * keyed by field name (e.g. `{ title: 'Обязательное поле', tickets: '...' }`).
 * Lets a form show each error next to the input it belongs to, instead of
 * only the single summary line `getErrorMessage()` returns. The generic
 * `error` key (business-logic errors with no single field to attach to,
 * e.g. an invalid date combination) is excluded — that one belongs in a
 * top-level message, not next to a field.
 */
export const getFieldErrors = (error: unknown): Record<string, string> => {
    const resError = error as ApiType.ResError
    if (!resError?.messages) {
        return {}
    }
    const { error: _generic, ...fieldMessages } = resError.messages
    return fieldMessages
}
