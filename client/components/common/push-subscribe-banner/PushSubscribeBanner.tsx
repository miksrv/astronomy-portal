import React, { useEffect, useState } from 'react'
import { getCookie, setCookie } from 'cookies-next'
import { Button, Icon, Message } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { PUSH_PROMPT_APPEAR_DELAY, PUSH_PROMPT_DISMISS_COOKIE, PUSH_PROMPT_DISMISS_DURATION } from '@/utils/constants'
import { getCurrentPushSubscription, getPushPermissionState, subscribeToPush } from '@/utils/push'

import styles from './styles.module.sass'

// How long the "Готово!" confirmation stays up before the panel auto-closes.
const SUBSCRIBED_DURATION = 3000

/**
 * Site-wide, dismissible reminder to enable browser push notifications,
 * shown on every /stargazing page (mounted from AppLayout, gated on
 * pathname) to guests and logged-in users alike — pushing discovery to
 * where the audience already is, instead of relying on someone finding the
 * toggle buried in /profile.
 *
 * Floats just under the fixed header, its own compact bar rather than a
 * modal or a bottom-of-viewport panel: two lines of copy on the left, the
 * "Не сейчас"/"Подписаться" actions on the right, no separate close button
 * — "Не сейчас" already dismisses it. A guest may subscribe here before
 * ever logging in — see usePushClaim for how that subscription gets linked
 * to their account once they do.
 */
export const PushSubscribeBanner: React.FC = () => {
    const { t } = useTranslation()

    const { data: vapidData } = API.usePushGetVapidKeyQuery()
    const [subscribe, { isLoading }] = API.usePushSubscribeMutation()

    const [supported, setSupported] = useState(false)
    const [dismissed, setDismissed] = useState<boolean | null>(null)
    const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
    const [appeared, setAppeared] = useState(false)
    const [justSubscribed, setJustSubscribed] = useState(false)
    const [error, setError] = useState<string | undefined>()

    useEffect(() => {
        setSupported(
            typeof navigator !== 'undefined' &&
                'serviceWorker' in navigator &&
                typeof window !== 'undefined' &&
                'PushManager' in window
        )
        setDismissed(!!getCookie(PUSH_PROMPT_DISMISS_COOKIE))

        void getCurrentPushSubscription().then((current) => setHasSubscription(!!current))
    }, [])

    // Don't flash in instantly on page load.
    useEffect(() => {
        const timer = setTimeout(() => setAppeared(true), PUSH_PROMPT_APPEAR_DELAY)
        return () => clearTimeout(timer)
    }, [])

    // Auto-close the "Готово!" confirmation a few seconds after subscribing.
    useEffect(() => {
        if (!justSubscribed) {
            return
        }

        const timer = setTimeout(() => setJustSubscribed(false), SUBSCRIBED_DURATION)
        return () => clearTimeout(timer)
    }, [justSubscribed])

    const handleDismiss = () => {
        void setCookie(PUSH_PROMPT_DISMISS_COOKIE, '1', { maxAge: PUSH_PROMPT_DISMISS_DURATION })
        setDismissed(true)
    }

    const handleSubscribe = async () => {
        setError(undefined)

        try {
            if (!vapidData?.publicKey) {
                throw new Error('No VAPID key available')
            }

            const newSubscription = await subscribeToPush(vapidData.publicKey)

            try {
                const json = newSubscription.toJSON()

                if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                    throw new Error('Incomplete push subscription')
                }

                await subscribe({
                    endpoint: json.endpoint,
                    keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
                    userAgent: navigator.userAgent
                }).unwrap()
            } catch (err) {
                // Roll back the browser-side subscription on any failure so
                // it never outlives the server record.
                await newSubscription.unsubscribe()
                throw err
            }

            setHasSubscription(true)
            setJustSubscribed(true)
        } catch {
            // Covers a rejected/failed subscribeToPush() too (e.g. the
            // permission prompt was denied, or the browser lacks support) -
            // not just the server POST.
            setError(t('components.common.push-subscribe-banner.error-generic', 'Не удалось включить push-уведомления'))
        }
    }

    // dismissed/hasSubscription === null means the checks haven't run yet
    // (SSR/first paint) - stay hidden until they have, to avoid a flash.
    // `error` overrides all of that so a failed attempt - e.g. the
    // permission prompt was just denied, flipping `getPushPermissionState()`
    // to 'denied' - doesn't yank the banner away before the user ever sees
    // why it failed.
    if (
        !error &&
        (!supported ||
            !appeared ||
            dismissed !== false ||
            hasSubscription !== false ||
            getPushPermissionState() === 'denied')
    ) {
        return null
    }

    return (
        <div
            className={styles.pushBanner}
            role={'complementary'}
            aria-label={t('components.common.push-subscribe-banner.title', 'Хотите узнавать о ближайших астровыездах?')}
        >
            {justSubscribed ? (
                <div className={styles.subscribedRow}>
                    <Icon
                        name={'CheckCircle'}
                        className={styles.subscribedIcon}
                    />
                    <p className={styles.subscribedText}>
                        {t('components.common.push-subscribe-banner.subscribed-title', 'Готово! Вы подписаны')}
                    </p>
                </div>
            ) : (
                <>
                    <div className={styles.textBlock}>
                        <p className={styles.title}>
                            {t(
                                'components.common.push-subscribe-banner.title',
                                'Хотите узнавать о ближайших астровыездах?'
                            )}
                        </p>
                        <p className={styles.subtitle}>
                            {t('components.common.push-subscribe-banner.subtitle', 'Разрешите уведомления в браузере')}
                        </p>

                        {error && <Message type={'error'}>{error}</Message>}
                    </div>

                    <div className={styles.actions}>
                        <Button
                            mode={'outline'}
                            size={'medium'}
                            label={t('components.common.push-subscribe-banner.dismiss', 'Не сейчас')}
                            onClick={handleDismiss}
                            disabled={isLoading}
                        />
                        <Button
                            mode={'primary'}
                            size={'medium'}
                            label={t('components.common.push-subscribe-banner.subscribe', 'Подписаться')}
                            onClick={() => void handleSubscribe()}
                            disabled={isLoading}
                        />
                    </div>
                </>
            )}
        </div>
    )
}
