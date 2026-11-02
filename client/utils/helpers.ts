import dayjs from 'dayjs'

import { SITE_LINK } from './constants'

type QueryParamValue = string | number | boolean | undefined | null

export const encodeQueryData = (data: object | void | undefined): string => {
    if (!data) {
        return ''
    }

    const record = data as Record<string, QueryParamValue>
    const ret = []
    for (const d in record) {
        if (Object.hasOwn(record, d) && record[d] != null) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(record[d] as string | number | boolean))
        }
    }

    return ret.length ? '?' + ret.join('&') : ''
}

/**
 * Returns the formatted time elapsed since the beginning of the event
 * @param sec {number}
 * @returns {string}
 */
export const formatSecondsToExposure = (sec: number | string): string => {
    const seconds = Number(sec)

    if (seconds <= 0) {
        return '0'
    }

    const h = (seconds / 3600) ^ 0
    const m = ((seconds - h * 3600) / 60) ^ 0

    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m)
}

export const minutesAgo = (date?: string | Date, withoutSuffix?: boolean): string =>
    date ? dayjs.utc(date).fromNow(withoutSuffix) : ''

/**
 * Rounds a number to a specified number of digits.
 *
 * @param value - The number to be rounded.
 * @param digits - The number of digits to round to. Defaults to 4.
 * @returns The rounded number, or undefined when there is no value (undefined/null/NaN). Zero is a value.
 */
export const round = (value?: number | null, digits: number = 4): number | undefined =>
    value == null || Number.isNaN(value) ? undefined : Number(value.toFixed(digits))

/** SITE_LINK with exactly one trailing slash (or '' when unset), whatever the env var says */
const siteBase = (): string => {
    const base = SITE_LINK ?? ''

    return base && !base.endsWith('/') ? `${base}/` : base
}

/**
 * Absolute locale-aware page URL: SITE_LINK + 'en/' prefix for English + path.
 * The single source of the locale-prefix rule — used by AppLayout (canonical/og:url),
 * BreadcrumbJsonLd and page-level JSON-LD blocks; must stay consistent between them.
 */
export const createPageUrl = (language?: string, path: string = ''): string =>
    `${siteBase()}${language === 'en' ? 'en/' : ''}${path.replace(/^\//, '')}`

/**
 * Serialize a JSON-LD object for a `<script type="application/ld+json">` body: '<' is
 * escaped so no string inside (a translated title, an admin-authored page name) can ever
 * close the script tag and break out into markup.
 */
export const toJsonLd = (data: object): string => JSON.stringify(data).replace(/</g, '\\u003c')

/** The visitor asked the OS for less motion; false where matchMedia is unavailable (SSR, jsdom). */
export const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

/**
 * True for a path the app may redirect to after login: relative, same-origin.
 * "//host", "/\host" and "/x://" are read by browsers as absolute URLs (an open
 * redirect), so they are rejected along with control characters.
 */
export const isSafeReturnPath = (path: unknown): path is string =>
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !path.includes('://') &&
    !/[\u0000-\u001F\u007F]/.test(path)
