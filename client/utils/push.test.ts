import {
    getCurrentPushSubscription,
    getPushPermissionState,
    registerServiceWorker,
    subscribeToPush,
    unsubscribeFromPush,
    urlBase64ToUint8Array
} from './push'

describe('push', () => {
    afterEach(() => {
        jest.restoreAllMocks()
        // @ts-expect-error -- test-only cleanup of a global stubbed per-test
        delete navigator.serviceWorker
        // @ts-expect-error -- test-only cleanup of a global stubbed per-test
        delete global.Notification
    })

    describe('urlBase64ToUint8Array', () => {
        it('decodes a URL-safe base64 string without padding', () => {
            // "test" -> base64 "dGVzdA==" -> url-safe (no padding) "dGVzdA"
            const result = urlBase64ToUint8Array('dGVzdA')
            expect(Array.from(result)).toStrictEqual([116, 101, 115, 116])
        })

        it('replaces URL-safe characters (- and _) before decoding', () => {
            // bytes [251, 255, 191] -> base64 "-/+/"-ish edge chars
            const base64Standard = Buffer.from([251, 255, 191]).toString('base64')
            const urlSafe = base64Standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

            const result = urlBase64ToUint8Array(urlSafe)
            expect(Array.from(result)).toStrictEqual([251, 255, 191])
        })

        it('returns an empty array for an empty string', () => {
            expect(Array.from(urlBase64ToUint8Array(''))).toStrictEqual([])
        })
    })

    describe('getPushPermissionState', () => {
        it('returns "default" when Notification is not supported', () => {
            // @ts-expect-error -- simulating an environment without Notification
            delete global.Notification
            expect(getPushPermissionState()).toBe('default')
        })

        it('returns Notification.permission when supported', () => {
            // @ts-expect-error -- test-only stub of the global Notification API
            global.Notification = { permission: 'granted' }
            expect(getPushPermissionState()).toBe('granted')
        })
    })

    describe('registerServiceWorker', () => {
        it('returns null when serviceWorker is not supported', async () => {
            expect(await registerServiceWorker()).toBeNull()
        })

        it('registers /sw.js when supported', async () => {
            const registration = { scope: '/' }
            const register = jest.fn().mockResolvedValue(registration)
            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: { register }
            })

            const result = await registerServiceWorker()

            expect(register).toHaveBeenCalledWith('/sw.js')
            expect(result).toBe(registration)
        })
    })

    describe('subscribeToPush', () => {
        it('subscribes using an existing registration', async () => {
            const subscription = { endpoint: 'https://push.example/1' }
            const subscribe = jest.fn().mockResolvedValue(subscription)
            const getRegistration = jest.fn().mockResolvedValue({ pushManager: { subscribe } })

            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: { getRegistration }
            })

            const result = await subscribeToPush('AAAA')

            expect(subscribe).toHaveBeenCalledWith(
                expect.objectContaining({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) })
            )
            expect(result).toBe(subscription)
        })

        it('falls back to registering a new service worker if none exists yet', async () => {
            const subscription = { endpoint: 'https://push.example/2' }
            const subscribe = jest.fn().mockResolvedValue(subscription)
            const getRegistration = jest.fn().mockResolvedValue(undefined)
            const register = jest.fn().mockResolvedValue({ pushManager: { subscribe } })

            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: { getRegistration, register }
            })

            const result = await subscribeToPush('AAAA')

            expect(register).toHaveBeenCalledWith('/sw.js')
            expect(result).toBe(subscription)
        })

        it('throws when service workers are not supported at all', async () => {
            await expect(subscribeToPush('AAAA')).rejects.toThrow('Service worker not supported')
        })
    })

    describe('getCurrentPushSubscription', () => {
        it('returns null when serviceWorker is not supported', async () => {
            expect(await getCurrentPushSubscription()).toBeNull()
        })

        it('returns null when there is no registration', async () => {
            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: { getRegistration: jest.fn().mockResolvedValue(undefined) }
            })

            expect(await getCurrentPushSubscription()).toBeNull()
        })

        it('returns the current subscription from the registration', async () => {
            const subscription = { endpoint: 'https://push.example/3' }
            const getSubscription = jest.fn().mockResolvedValue(subscription)

            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: {
                    getRegistration: jest.fn().mockResolvedValue({ pushManager: { getSubscription } })
                }
            })

            expect(await getCurrentPushSubscription()).toBe(subscription)
        })
    })

    describe('unsubscribeFromPush', () => {
        it('returns null and does nothing when there is no active subscription', async () => {
            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: { getRegistration: jest.fn().mockResolvedValue(undefined) }
            })

            expect(await unsubscribeFromPush()).toBeNull()
        })

        it('unsubscribes and returns the subscription that was active', async () => {
            const unsubscribe = jest.fn().mockResolvedValue(true)
            const subscription = { endpoint: 'https://push.example/4', unsubscribe }
            const getSubscription = jest.fn().mockResolvedValue(subscription)

            Object.defineProperty(navigator, 'serviceWorker', {
                configurable: true,
                value: {
                    getRegistration: jest.fn().mockResolvedValue({ pushManager: { getSubscription } })
                }
            })

            const result = await unsubscribeFromPush()

            expect(unsubscribe).toHaveBeenCalled()
            expect(result).toBe(subscription)
        })
    })
})
