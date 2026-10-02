import { useCallback, useEffect, useRef, useState } from 'react'

import { loadTimezonePolygons, ResolvedTimeZone, resolveTimeZone } from './timezone'

/**
 * Location & time state for the star map (FE-2 of features/star-atlas-upgrade.md).
 *
 * - `date === null` means "now"; the selected date is deliberately NOT persisted to
 *   localStorage (Business Rule 13) — it lives in state and the permalink only.
 * - The browser geolocation prompt fires only from an explicit user gesture
 *   (Business Rule 3): the "my location" button or the first switch into horizon mode.
 * - The timezone of the selected place resolves lazily (the polygons file is ~516 KB):
 *   a bare visit never fetches it; it is fetched as soon as a date is in play — from
 *   the permalink on mount, from a later `setDate`, or when the user focuses the time
 *   controls — because a picked moment must be shown in the place's local time
 *   (Business Rule 12).
 */

export type StarMapLocationState = {
    date: Date | null
    setDate: (date: Date | null) => void
    timeZone: ResolvedTimeZone | null
    /** True while the timezone of the current geopos is being resolved */
    timeZonePending: boolean
    /** Resolve (and cache) the timezone for the current geopos; safe to call repeatedly */
    ensureTimeZone: () => Promise<ResolvedTimeZone | null>
    /** Ask the browser for the user's position; resolves to the position or null on deny/timeout */
    requestBrowserLocation: () => Promise<[number, number] | null>
    geolocationPending: boolean
}

export const getBrowserPosition = (timeoutMs: number = 8000): Promise<[number, number] | null> =>
    new Promise((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            resolve(null)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) =>
                resolve([
                    Math.round(position.coords.latitude * 10_000) / 10_000,
                    Math.round(position.coords.longitude * 10_000) / 10_000
                ]),
            () => resolve(null),
            { timeout: timeoutMs, maximumAge: 600_000 }
        )
    })

/**
 * Whether the timezone must be resolved right now: a date is selected (or the user has
 * already touched the time controls) and the cached zone belongs to a different place.
 * Pure — the hook's effect and the tests share it.
 */
export const shouldResolveTimeZone = (params: {
    date: Date | null
    /** The user has interacted with the time controls at least once */
    wanted: boolean
    /** geopos key the cached zone was resolved for; null when nothing is cached */
    resolvedFor: string | null
    geoposKey: string
}): boolean => (params.wanted || params.date != null) && params.resolvedFor !== params.geoposKey

export const useStarMapLocation = (
    geopos: [number, number],
    options?: { initialDate?: Date | null }
): StarMapLocationState => {
    const [date, setDateState] = useState<Date | null>(options?.initialDate ?? null)
    const [timeZone, setTimeZone] = useState<ResolvedTimeZone | null>(null)
    // A permalink date is shown in the place's local time as soon as the zone arrives —
    // start in the pending state so the control never shows a wrong (UTC) value first
    const [timeZonePending, setTimeZonePending] = useState<boolean>(Boolean(options?.initialDate))
    const [geolocationPending, setGeolocationPending] = useState(false)

    // Which geopos the current timeZone belongs to — and whether the user has ever
    // touched the time controls (before that, and without a date, the polygons file is
    // never fetched)
    const resolvedForRef = useRef<string | null>(null)
    // Mirror of `timeZone` for the callback below, whose deps deliberately exclude the
    // state (a fresh callback per resolution would re-trigger the sync effect)
    const timeZoneRef = useRef<ResolvedTimeZone | null>(null)
    const wantedRef = useRef(false)
    // Serial number of the latest resolution; a stale one must not clear the pending flag
    const resolveSeqRef = useRef(0)

    const geoposKey = `${geopos[0]}_${geopos[1]}`

    const ensureTimeZone = useCallback(async (): Promise<ResolvedTimeZone | null> => {
        wantedRef.current = true

        if (resolvedForRef.current === geoposKey && timeZoneRef.current) {
            setTimeZonePending(false)
            return timeZoneRef.current
        }

        const seq = ++resolveSeqRef.current
        setTimeZonePending(true)

        try {
            const polygons = await loadTimezonePolygons()

            if (!polygons.length) {
                return null
            }

            const resolved = resolveTimeZone(geopos[0], geopos[1], polygons)
            resolvedForRef.current = geoposKey
            timeZoneRef.current = resolved
            setTimeZone(resolved)

            return resolved
        } finally {
            if (seq === resolveSeqRef.current) {
                setTimeZonePending(false)
            }
        }
    }, [geoposKey])

    // Resolve as soon as a date is in play (permalink on mount, later setDate) or, once the
    // user has touched the time controls, whenever the place changes (e.g. "my location")
    useEffect(() => {
        if (
            shouldResolveTimeZone({
                date,
                wanted: wantedRef.current,
                resolvedFor: resolvedForRef.current,
                geoposKey
            })
        ) {
            void ensureTimeZone()
        }
    }, [date, geoposKey, ensureTimeZone])

    const setDate = useCallback(
        (next: Date | null) => {
            setDateState(next)

            // Flip to pending synchronously so the control shows "resolving…" on the very
            // same render the date appears, not one effect tick later
            if (next && resolvedForRef.current !== geoposKey) {
                setTimeZonePending(true)
            }
        },
        [geoposKey]
    )

    const requestBrowserLocation = useCallback(async (): Promise<[number, number] | null> => {
        setGeolocationPending(true)

        try {
            return await getBrowserPosition()
        } finally {
            setGeolocationPending(false)
        }
    }, [])

    return {
        date,
        setDate,
        timeZone,
        timeZonePending,
        ensureTimeZone,
        requestBrowserLocation,
        geolocationPending
    }
}
