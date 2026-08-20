import { useEffect } from 'react'

import { scrollToFirstFieldError } from '@/utils/formErrorScroll'

/**
 * Scrolls+focuses the first field a server-side validation error was just
 * synced onto (see `useSyncApiFieldErrors`) - a server error arrives well
 * after the user clicked Save, by which point they're often no longer
 * looking anywhere near the field it belongs to, so inline text alone isn't
 * enough to surface it.
 *
 * Deliberately a separate hook from `useSyncApiFieldErrors` rather than
 * built into it - `useSyncApiFieldErrors` is also used by forms that
 * intentionally keep the old “short form, error stays visible” behavior
 * (`LoginForm`, `ReviewForm`, `EventBookingForm`); only opt a form into
 * scrolling by calling this one alongside it.
 *
 * Usage:
 *   const { fieldErrors } = useApiFormError(error)
 *   useSyncApiFieldErrors(fieldErrors, setError)
 *   useScrollToApiFieldErrors(fieldErrors)
 */
export const useScrollToApiFieldErrors = (fieldErrors: Record<string, string>, aliases?: Record<string, string>) => {
    useEffect(() => {
        const fieldNames = Object.keys(fieldErrors)

        if (fieldNames.length > 0) {
            scrollToFirstFieldError(fieldNames, aliases)
        }
    }, [fieldErrors])
}

export default useScrollToApiFieldErrors
