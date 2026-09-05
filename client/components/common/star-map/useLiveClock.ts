import { useEffect, useRef } from 'react'

/** How often the live ("now") sky advances — a minute is well below what the eye notices */
export const LIVE_CLOCK_INTERVAL_MS = 60_000

/**
 * Periodic tick for the star map's "now" mode: while `enabled`, calls `onTick` every
 * `intervalMs`. Pauses entirely while the document is hidden (a background tab has no
 * viewer, and browsers throttle its timers anyway) and, once the tab is visible again,
 * fires `onTick` immediately so the sky catches up to real time before the next tick.
 *
 * `onTick` is read through a ref, so a new callback identity on every render does not
 * restart the interval.
 */
export const useLiveClock = (
    enabled: boolean,
    onTick: () => void,
    intervalMs: number = LIVE_CLOCK_INTERVAL_MS
): void => {
    const onTickRef = useRef(onTick)
    onTickRef.current = onTick

    useEffect(() => {
        if (!enabled) {
            return
        }

        let intervalId: ReturnType<typeof setInterval> | null = null

        const stop = () => {
            if (intervalId != null) {
                clearInterval(intervalId)
                intervalId = null
            }
        }

        const start = () => {
            if (intervalId == null) {
                intervalId = setInterval(() => onTickRef.current(), intervalMs)
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                stop()
                return
            }

            // Catch up right away, then resume the regular cadence from this moment
            onTickRef.current()
            stop()
            start()
        }

        if (document.visibilityState !== 'hidden') {
            start()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            stop()
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [enabled, intervalMs])
}
