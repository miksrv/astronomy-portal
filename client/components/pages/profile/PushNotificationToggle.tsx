import React, { useEffect, useState } from 'react'
import { Checkbox, Container, Message } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { getCurrentPushSubscription, getPushPermissionState, subscribeToPush, unsubscribeFromPush } from '@/utils/push'

import styles from './styles.module.sass'

export const PushNotificationToggle: React.FC = () => {
    const { t } = useTranslation()

    const { data: vapidData } = API.usePushGetVapidKeyQuery()

    const [subscribe, { isLoading: subscribeLoading }] = API.usePushSubscribeMutation()
    const [unsubscribe, { isLoading: unsubscribeLoading }] = API.usePushUnsubscribeMutation()

    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)
    const [initialized, setInitialized] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | undefined>()

    useEffect(() => {
        setPermission(getPushPermissionState())

        void getCurrentPushSubscription().then((current) => {
            setSubscription(current)
            setInitialized(true)
        })
    }, [])

    // subscribeLoading/unsubscribeLoading only cover the RTK Query mutation
    // itself, not subscribeToPush()/unsubscribeFromPush() - the native
    // permission prompt and pushManager (un)subscribe calls that run before/
    // after it. Without isProcessing, the checkbox stayed enabled and
    // visibly unchanged during that gap, reading as "nothing happened" while
    // handleChange was in fact already running.
    const isBusy = subscribeLoading || unsubscribeLoading || isProcessing || !initialized

    const handleChange = async (checked: boolean) => {
        setError(undefined)
        setIsProcessing(true)

        try {
            if (checked) {
                if (!vapidData?.publicKey) {
                    setError(
                        t(
                            'pages.profile.push-error-no-key',
                            'Не удалось получить ключ для push-уведомлений, попробуйте позже'
                        )
                    )
                    return
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
                    // it never outlives the server record - otherwise the
                    // toggle would show "on" after a reload with no matching
                    // push_subscriptions row and nothing would ever be delivered.
                    await newSubscription.unsubscribe()
                    throw err
                }

                setSubscription(newSubscription)
                setPermission(getPushPermissionState())
            } else {
                const previousSubscription = subscription

                // Tell the server first: if this fails, keep the browser
                // subscription intact so the two stay in sync (the toggle
                // remains "on", matching the still-present server row)
                // instead of silently orphaning the server-side record.
                if (previousSubscription?.endpoint) {
                    await unsubscribe({ endpoint: previousSubscription.endpoint }).unwrap()
                }

                await unsubscribeFromPush()

                setSubscription(null)
            }
        } catch {
            setError(t('pages.profile.push-error-generic', 'Не удалось изменить настройки push-уведомлений'))
        } finally {
            setIsProcessing(false)
        }
    }

    const isDenied = permission === 'denied'

    return (
        <Container className={styles.pushToggleContainer}>
            <Checkbox
                label={t('pages.profile.push-toggle-label', 'Push-уведомления в браузере')}
                checked={Boolean(subscription)}
                disabled={isDenied || isBusy}
                onChange={(e) => void handleChange(e.target.checked)}
            />

            <p className={styles.fieldNote}>
                {t('pages.profile.push-toggle-note', 'Получайте уведомления о ближайших астровыездах прямо в браузере')}
            </p>

            {isDenied && (
                <Message type={'info'}>
                    {t(
                        'pages.profile.push-blocked',
                        'Уведомления заблокированы в настройках браузера. Разрешите их, чтобы включить эту опцию.'
                    )}
                </Message>
            )}

            {error && <Message type={'error'}>{error}</Message>}
        </Container>
    )
}
