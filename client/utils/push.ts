/**
 * Thin wrappers around the browser's Service Worker / Push / Notification
 * Web APIs. Deliberately has no knowledge of the `/push/*` REST endpoints -
 * those calls are made via RTK Query hooks in the component that uses this
 * module (see `client/components/pages/profile/PushNotificationToggle.tsx`),
 * so this file stays a pure Web-API layer.
 */

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) {
        return null
    }

    return navigator.serviceWorker.register('/sw.js')
}

export const getPushPermissionState = (): NotificationPermission =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'

/**
 * Converts a URL-safe base64 VAPID public key into the raw Uint8Array shape
 * `PushManager.subscribe()`'s `applicationServerKey` option expects.
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)

    // `Uint8Array.from()` infers `Uint8Array<ArrayBufferLike>`, which no longer
    // satisfies `BufferSource` (requires `Uint8Array<ArrayBuffer>`) under this
    // project's TypeScript version - construct explicitly to get a concrete
    // ArrayBuffer-backed array instead.
    const bytes = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; i++) {
        bytes[i] = rawData.charCodeAt(i)
    }

    return bytes
}

export const subscribeToPush = async (vapidPublicKey: string): Promise<PushSubscription> => {
    const existingRegistration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    const registration = existingRegistration || (await registerServiceWorker())

    if (!registration) {
        throw new Error('Service worker not supported')
    }

    return registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        userVisibleOnly: true
    })
}

export const getCurrentPushSubscription = async (): Promise<PushSubscription | null> => {
    if (!('serviceWorker' in navigator)) {
        return null
    }

    const registration = await navigator.serviceWorker.getRegistration()

    if (!registration) {
        return null
    }

    return registration.pushManager.getSubscription()
}

export const unsubscribeFromPush = async (): Promise<PushSubscription | null> => {
    const subscription = await getCurrentPushSubscription()

    if (subscription) {
        await subscription.unsubscribe()
    }

    return subscription
}
