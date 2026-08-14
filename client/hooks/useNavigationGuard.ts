import { useEffect, useRef } from 'react'

import { useRouter } from 'next/router'

/**
 * Blocks the user from leaving the current page - both in-app navigation
 * (`routeChangeStart`) and tab close/refresh (`beforeunload`) - while
 * `isBlocking` is true. In-app navigation is stopped with a confirm() prompt
 * (`confirmMessage`); the browser supplies its own generic prompt for
 * tab close/refresh, `event.returnValue` only controls whether it appears.
 *
 * Extracted from the payment-page pattern (`pages/stargazing/payment.tsx`,
 * which keeps its own inline copy since converting a live payment flow was
 * judged too risky) so other flows that must not be interrupted mid-flight -
 * e.g. an active photo upload batch - can reuse it without duplicating the
 * listener wiring.
 */
export const useNavigationGuard = (isBlocking: boolean, confirmMessage: string): void => {
    const router = useRouter()

    // Read inside the listeners via a ref so the effect below doesn't need to
    // re-subscribe every time `isBlocking` flips.
    const isBlockingRef = useRef(isBlocking)

    useEffect(() => {
        isBlockingRef.current = isBlocking
    }, [isBlocking])

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isBlockingRef.current) {
                event.preventDefault()
                event.returnValue = ''
            }
        }

        const handleRouteChangeStart = () => {
            if (!isBlockingRef.current) {
                return
            }

            const confirmed = window.confirm(confirmMessage)

            if (!confirmed) {
                router.events.emit('routeChangeError')
                throw 'routeChange aborted (navigation guard active)'
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        router.events.on('routeChangeStart', handleRouteChangeStart)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            router.events.off('routeChangeStart', handleRouteChangeStart)
        }
    }, [router, confirmMessage])
}

export default useNavigationGuard
