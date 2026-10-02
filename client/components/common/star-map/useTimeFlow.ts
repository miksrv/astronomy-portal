import { RefObject, useCallback, useRef, useState } from 'react'

import { stepTimeRate, TIME_RATE_MIN } from './timeFlow'

export interface UseTimeFlowOptions {
    /** The selected fixed moment; null means the map follows the clock (real or simulated) */
    dateRef: RefObject<Date | null>
    /** Pin the map to a moment (or clear it back to the live sky) — useStarMapLocation */
    setDate: (date: Date | null) => void
}

export interface TimeFlowController {
    /** Seconds of sky per real second (timeFlow.ts); TIME_RATE_MIN is real time */
    timeRate: number
    /**
     * The map's clock while no fixed moment is selected: the real "now" captured at the
     * last live tick or rebuild — or, while the flow runs, the simulated instant, which
     * useCelestialDisplay advances every animation frame. Redraw-time astronomy reads it
     * instead of `new Date()`, so one redraw is computed for one instant.
     */
    nowRef: RefObject<Date>
    /** The moment the map is currently computed for: the selected date, else `nowRef` */
    resolveDate: () => Date
    /** Multiply the rate by `factor` (the ×2 / ×8 / ÷2 / ÷8 buttons) */
    changeTimeRate: (factor: number) => void
    /** Freeze the sky at the moment the flow reached and drop back to real time */
    pauseTimeFlow: () => void
    /** Pick a moment by hand (or null for the live sky); ends any running flow */
    selectDate: (next: Date | null) => void
}

/**
 * The time model of the star map: which instant the sky is drawn for and how fast it
 * moves. A fixed moment lives in `dateRef` (useStarMapLocation); otherwise the clock in
 * `nowRef` rules, advanced by useCelestialDisplay — once a minute at real time, every
 * frame while the flow runs. The rate is React state (the buttons render it), mirrored in
 * a ref so the handlers never act on a stale render snapshot.
 */
export const useTimeFlow = ({ dateRef, setDate }: UseTimeFlowOptions): TimeFlowController => {
    const [timeRate, setTimeRate] = useState<number>(TIME_RATE_MIN)
    const timeRateRef = useRef<number>(TIME_RATE_MIN)
    const nowRef = useRef<Date>(new Date())

    const resolveDate = useCallback((): Date => dateRef.current ?? nowRef.current, [dateRef])

    const applyRate = useCallback((next: number) => {
        timeRateRef.current = next
        setTimeRate(next)
    }, [])

    /**
     * Speed the flow up or slow it back down. A flow started from a picked moment takes that
     * moment as its starting point and then owns the clock: the map is no longer pinned to a
     * fixed instant (so the permalink stops advertising one), it is running from it. Leaving
     * real time starts from the actual current instant, not the minute-old live tick.
     */
    const changeTimeRate = useCallback(
        (factor: number) => {
            const current = timeRateRef.current
            const next = stepTimeRate(current, factor)

            if (next === current) {
                return
            }

            if (current === TIME_RATE_MIN && next > TIME_RATE_MIN) {
                nowRef.current = dateRef.current ?? new Date()
                setDate(null)
            }

            // Slowing all the way back to real time pins the moment the flow reached, the
            // same as the pause does. Letting the live tick take over instead would snap the
            // sky back to the real "now" and silently throw away the travelling.
            if (next === TIME_RATE_MIN) {
                setDate(nowRef.current)
            }

            applyRate(next)
        },
        [dateRef, setDate, applyRate]
    )

    /** Pause: freeze the sky at the moment the flow reached and reset the speed to real time. */
    const pauseTimeFlow = useCallback(() => {
        const stopAt = timeRateRef.current > TIME_RATE_MIN ? nowRef.current : (dateRef.current ?? new Date())

        applyRate(TIME_RATE_MIN)
        setDate(stopAt)
    }, [dateRef, setDate, applyRate])

    /**
     * Picking a moment by hand (or clearing it back to the live sky) ends any running flow —
     * the visitor asked for that instant, not for a clock still running away from it.
     */
    const selectDate = useCallback(
        (next: Date | null) => {
            applyRate(TIME_RATE_MIN)
            setDate(next)
        },
        [setDate, applyRate]
    )

    return { timeRate, nowRef, resolveDate, changeTimeRate, pauseTimeFlow, selectDate }
}
