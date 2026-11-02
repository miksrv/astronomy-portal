import { useCallback, useMemo, useSyncExternalStore } from 'react'

const getServerSnapshot = (): null => null

/**
 * The current time, ticking every `intervalMs` and rounded down to it - or `undefined` on the
 * server and during hydration. Anything derived from "now" (what's visible tonight, the Sun's
 * altitude) is rendered on the client only, so the server HTML and the first client render
 * always agree; reserve the space it takes so nothing shifts when it appears.
 */
export const useNow = (intervalMs: number = 60_000): Date | undefined => {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const timer = setInterval(onChange, intervalMs)

            // A hidden tab throttles the interval: catch up the moment it is shown again
            const handleVisibility = () => {
                if (document.visibilityState === 'visible') {
                    onChange()
                }
            }

            document.addEventListener('visibilitychange', handleVisibility)

            return () => {
                clearInterval(timer)
                document.removeEventListener('visibilitychange', handleVisibility)
            }
        },
        [intervalMs]
    )

    // A primitive snapshot, stable within one interval, as useSyncExternalStore requires
    const getSnapshot = useCallback(() => Math.floor(Date.now() / intervalMs) * intervalMs, [intervalMs])

    const timestamp = useSyncExternalStore<number | null>(subscribe, getSnapshot, getServerSnapshot)

    return useMemo(() => (timestamp == null ? undefined : new Date(timestamp)), [timestamp])
}
