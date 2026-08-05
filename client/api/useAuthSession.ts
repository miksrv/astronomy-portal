import { useEffect } from 'react'

import { API, useAppDispatch, useAppSelector } from '@/api'
import { login, logout } from '@/api/authSlice'

/**
 * Keeps the client-side auth state in sync with the backend on every fresh
 * page load, implementing a sliding session expiration.
 *
 * The JWT issued by the backend is long-lived (`auth.token.live`, currently
 * 180 days) but never renews itself while sitting in localStorage/cookie —
 * it always carries the `exp` it was issued with. `Auth::responseAuth()`
 * re-issues a brand new token (fresh `iat`/`exp`) on every successful
 * `/auth/me` call, and the `login()` reducer persists whatever token it is
 * given back to localStorage/cookie. So calling `/auth/me` once per visit —
 * whenever a stored token exists and the session isn't already marked
 * authenticated — is enough to push the expiry out another 180 days each
 * time. As long as the user opens the site at least once within that
 * window, they never get signed out.
 *
 * Mount this (or call this hook) on every page — not just inside
 * `AppHeader` — so the refresh isn't tied to whichever layout happens to
 * render the header. RTK Query dedupes identical concurrent queries, so
 * calling this hook from multiple components is safe and doesn't cause
 * extra requests.
 */
export const useAuthSession = () => {
    const dispatch = useAppDispatch()
    const token = useAppSelector((state) => state.auth.token)
    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const {
        data: meData,
        error,
        isLoading
    } = API.useAuthGetMeQuery(undefined, {
        skip: !token?.length || isAuth
    })

    useEffect(() => {
        if (meData?.auth === true) {
            dispatch(login(meData))
        } else if (meData?.auth === false) {
            dispatch(logout())
        }
        // `error` is intentionally in the deps list even though it isn't read here:
        // a transient network error shouldn't log the user out (no `meData`, no
        // dispatch), but it should re-run this effect once the query settles.
    }, [meData, error, dispatch])

    return { isLoading }
}
