import { ApiType } from '@/api'

/**
 * Extracts the human-readable error message from an RTK Query error response,
 * for a generic `<Message type="error">` block. The backend always sends
 * `{ message: string, errors?: Record<string, string> }` (see
 * server/app/Controllers/BaseApiController.php) - `message` is present on
 * every error response, field-level or not.
 */
export const getErrorMessage = (error: unknown): string | undefined => {
    return (error as ApiType.ResError)?.message
}

/**
 * Extracts per-field validation messages from an RTK Query error response,
 * keyed by field name (e.g. `{ title: 'Обязательное поле', tickets: '...' }`).
 * Lets a form show each error next to the input it belongs to, instead of
 * only the single summary line `getErrorMessage()` returns. Empty when the
 * error isn't tied to specific fields - that case belongs in a top-level
 * message only.
 */
export const getFieldErrors = (error: unknown): Record<string, string> => {
    return (error as ApiType.ResError)?.errors ?? {}
}
