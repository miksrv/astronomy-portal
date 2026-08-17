import { useEffect } from 'react'

import { API, useAppSelector } from '@/api'
import { getCurrentPushSubscription } from '@/utils/push'

/**
 * Claims an already-existing browser push subscription for the current
 * account right after login/registration.
 *
 * A guest may opt into push notifications (see PushSubscribeBanner) before
 * ever logging in — the server stores that subscription with no owning
 * user. Once `isAuth` flips to true (OAuth, magic link, or a fresh page
 * load's sliding-session refresh — see useAuthSession), this re-POSTs the
 * same endpoint/keys via the exact same `pushSubscribe` mutation the banner
 * itself uses. No new backend endpoint is involved: since the request now
 * carries the Authorization header, PushSubscriptionsModel::upsertByEndpoint()
 * updates the existing row in place with the real user_id instead of
 * creating a duplicate.
 *
 * Mount this once, unconditionally, on every route (see PushClaimSync in
 * _app.tsx) — same rationale as useAuthSession itself.
 */
export const usePushClaim = () => {
    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const [subscribe] = API.usePushSubscribeMutation()

    useEffect(() => {
        if (!isAuth) {
            return
        }

        void (async () => {
            const existing = await getCurrentPushSubscription()

            if (!existing) {
                return
            }

            const json = existing.toJSON()

            if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                return
            }

            try {
                await subscribe({
                    endpoint: json.endpoint,
                    keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
                    userAgent: navigator.userAgent
                }).unwrap()
            } catch {
                // Best-effort: if this fails, the subscription just stays
                // unclaimed/anonymous until the next successful login - there's
                // nothing user-visible to recover here.
            }
        })()
    }, [isAuth, subscribe])
}
