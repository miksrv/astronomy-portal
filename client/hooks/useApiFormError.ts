import { useMemo } from 'react'

import { getErrorMessage, getFieldErrors } from '@/utils/errors'

/**
 * Normalizes an RTK Query mutation/query `error` into what a form needs:
 * a single top-level message (for a generic `<Message type="error">` block)
 * plus a per-field map (for each `Input`/`TextArea`'s `error` prop).
 *
 * This is the one place that should read `error.message`/`error.errors` -
 * forms should use this instead of re-parsing the error shape themselves
 * (see ReviewForm/ProfileCard/EventBookingForm before this hook existed,
 * each of which had a subtly different, and sometimes wrong, inline parser).
 */
export const useApiFormError = (error: unknown) =>
    useMemo(
        () => ({
            message: getErrorMessage(error),
            fieldErrors: getFieldErrors(error)
        }),
        [error]
    )

export default useApiFormError
