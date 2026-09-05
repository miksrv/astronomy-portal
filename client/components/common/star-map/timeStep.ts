import { dateToWallClock, ResolvedTimeZone, wallClockToDate } from './timezone'

/**
 * Time-step helpers for the star map's place & time control: "an hour later",
 * "same time tomorrow" without touching the datetime-local field.
 */

export type TimeStep = 'hour' | 'day'

export type TimeStepDirection = 1 | -1

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

const isoDay = (year: number, month: number, day: number): string =>
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/**
 * Shift `base` by one hour or one day.
 *
 * - `hour` is exactly ±3600 s.
 * - `day` is ±1 *calendar* day in the place's local time, keeping the wall-clock time:
 *   "tomorrow at 22:00" stays 22:00 across a DST switch instead of drifting to 21:00/23:00.
 *   Without a resolved zone it degrades to ±86400 s.
 */
export const stepDate = (
    base: Date,
    step: TimeStep,
    direction: TimeStepDirection,
    timeZone: ResolvedTimeZone | null
): Date => {
    if (step === 'hour') {
        return new Date(base.getTime() + direction * HOUR_MS)
    }

    if (!timeZone) {
        return new Date(base.getTime() + direction * DAY_MS)
    }

    // 'YYYY-MM-DDTHH:mm' in the place's zone → move the date part by one day (Date.UTC
    // normalises month/year overflow) → interpret the same wall-clock time in the zone
    const wallClock = dateToWallClock(base, timeZone)
    const [datePart = '', timePart = ''] = wallClock.split('T')
    const [year = 0, month = 1, day = 1] = datePart.split('-').map(Number)
    const shifted = new Date(Date.UTC(year, month - 1, day + direction))
    const nextWallClock = `${isoDay(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())}T${timePart}`

    return wallClockToDate(nextWallClock, timeZone) ?? new Date(base.getTime() + direction * DAY_MS)
}
