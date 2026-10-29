/**
 * Time-flow model for the star map: instead of stepping the sky by a fixed hour or day,
 * the visitor speeds the clock up and watches the sky move, the way a phone planetarium
 * does. `rate` is how many seconds of sky pass per real second — 1 is real time, and the
 * flow never runs slower than that (the "slow down" buttons only undo an acceleration).
 */

/** Real time — the slowest the flow ever runs */
export const TIME_RATE_MIN = 1

/** One day of sky per real second; past this the sky is a blur and the redraws are wasted */
export const TIME_RATE_MAX = 86_400

/**
 * A frame after the tab was hidden (or the main thread was blocked) can report a huge
 * delta; clamping it keeps the sky from jumping minutes-to-hours in one step.
 */
export const MAX_FRAME_ELAPSED_MS = 100

export type TimeRateUnits = {
    /** Suffix for "N minutes of sky per second", e.g. 'мин/с' */
    minute: string
    hour: string
    day: string
}

const clampRate = (rate: number): number => Math.min(TIME_RATE_MAX, Math.max(TIME_RATE_MIN, rate))

/** Multiply the rate by `factor` (0.125 / 0.5 / 2 / 8), clamped to the allowed band. */
export const stepTimeRate = (rate: number, factor: number): number => {
    if (!Number.isFinite(rate) || !Number.isFinite(factor) || factor <= 0) {
        return TIME_RATE_MIN
    }

    return clampRate(rate * factor)
}

/**
 * Human caption for a rate: a bare multiplier while the numbers stay small, then how much
 * sky passes per second, which is what the eye actually reads at speed ("1 ч/с").
 */
export const formatTimeRate = (rate: number, units: TimeRateUnits): string => {
    const value = clampRate(rate)

    if (value < 60) {
        return `×${Math.round(value)}`
    }

    const [amount, unit] =
        value < 3600
            ? [value / 60, units.minute]
            : value < 86_400
              ? [value / 3600, units.hour]
              : [value / 86_400, units.day]
    // One decimal only where it carries information (×64 → 1.1 мин/с, not 1 мин/с)
    const rounded = Math.round(amount * 10) / 10

    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unit}`
}

/** Advance the simulated clock by one animation frame. */
export const advanceClock = (current: Date, elapsedMs: number, rate: number): Date => {
    const elapsed = Math.min(Math.max(elapsedMs, 0), MAX_FRAME_ELAPSED_MS)

    return new Date(current.getTime() + elapsed * clampRate(rate))
}
