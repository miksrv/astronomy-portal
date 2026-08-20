import { useCallback } from 'react'

import { useAppDispatch } from '@/api'
import { dismissSnackbar, pushSnackbar, SnackbarType } from '@/api/applicationSlice'

export interface PushSnackbarOptions {
    type?: SnackbarType
    /** Auto-dismiss delay in ms; `SnackbarStack` applies a type-based default when omitted. */
    duration?: number
}

// Plain module-level counter, not `crypto.randomUUID()` - snackbars are only
// ever pushed from a browser event/effect, never during SSR, so uniqueness
// within one page session is all `dismissSnackbar` needs.
let snackbarSeq = 0

/**
 * The single "something happened, and it's not tied to any one field"
 * feedback channel - a generic save error or a save confirmation. Renders as
 * a stackable, auto-dismissing toast (`SnackbarStack`, mounted once in
 * `AppLayout`) so it's visible regardless of scroll position, without
 * needing a page to place/scroll to its own `<Message>`.
 *
 * Deliberately NOT for field-level validation errors - those stay inline
 * next to the field plus `scrollToFirstFieldError`/`useSyncApiFieldErrors`
 * (see `client/utils/formErrorScroll.ts`), since a toast can't point at
 * *which* field is wrong once it's dismissed. Also skip it for a success
 * that navigates away right after - only push one when the page stays put.
 */
export const useSnackbar = () => {
    const dispatch = useAppDispatch()

    const push = useCallback(
        (message: string, options?: PushSnackbarOptions) => {
            snackbarSeq += 1
            const id = `snackbar-${snackbarSeq}`

            dispatch(
                pushSnackbar({
                    id,
                    message,
                    type: options?.type ?? 'info',
                    duration: options?.duration
                })
            )

            return id
        },
        [dispatch]
    )

    const dismiss = useCallback((id: string) => dispatch(dismissSnackbar(id)), [dispatch])

    return { push, dismiss }
}

export default useSnackbar
