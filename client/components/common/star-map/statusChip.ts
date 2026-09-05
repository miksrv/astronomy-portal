import { dateToWallClock, ResolvedTimeZone } from './timezone'

/**
 * Pure formatters for the map's status chip ("place · moment"): the one always-visible
 * caption that tells a visitor which sky they are looking at — where from and when.
 * Kept out of the component so they can be unit-tested and reused (the chip doubles
 * as the screenshot caption for the Telegram workflows in features/star-atlas-upgrade.md).
 */

/** Localized single-letter hemisphere labels, e.g. { n: 'С', s: 'Ю', e: 'В', w: 'З' } */
export type HemisphereLetters = {
    n: string
    s: string
    e: string
    w: string
}

/** `[51.82, 55.17]` → `51.82° N, 55.17° E` (two decimals ≈ 1 km, same as the permalink) */
export const formatGeopos = ([lat, lon]: [number, number], letters: HemisphereLetters): string => {
    const latLetter = lat < 0 ? letters.s : letters.n
    const lonLetter = lon < 0 ? letters.w : letters.e

    return `${Math.abs(lat).toFixed(2)}° ${latLetter}, ${Math.abs(lon).toFixed(2)}° ${lonLetter}`
}

/** Wall-clock `HH:mm` of the instant in the place's timezone */
export const formatLocalClock = (date: Date, timeZone: ResolvedTimeZone): string =>
    dateToWallClock(date, timeZone).slice(11, 16)

/** Wall-clock `DD.MM.YYYY HH:mm` of the instant in the place's timezone */
export const formatLocalDateTime = (date: Date, timeZone: ResolvedTimeZone): string => {
    const wallClock = dateToWallClock(date, timeZone)
    const [datePart = '', timePart = ''] = wallClock.split('T')
    const [year = '', month = '', day = ''] = datePart.split('-')

    return `${day}.${month}.${year} ${timePart}`
}

/** Wall-clock `DD.MM.YYYY` only — shown while the place's timezone is still resolving */
export const formatLocalDate = (date: Date, timeZone: ResolvedTimeZone): string =>
    formatLocalDateTime(date, timeZone).slice(0, 10)
