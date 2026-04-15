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
