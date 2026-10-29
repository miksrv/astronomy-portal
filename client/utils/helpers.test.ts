import { SITE_LINK } from './constants'
import { createPageUrl, formatSecondsToExposure, getTimeFromSec, round, toJsonLd } from './helpers'

/** createPageUrl as built with a specific NEXT_PUBLIC_SITE_LINK (the constant is read at import time). */
const createPageUrlWithSiteLink = (siteLink: string | undefined, language?: string, path?: string): string => {
    const previous = process.env.NEXT_PUBLIC_SITE_LINK
    let result = ''

    if (siteLink === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_LINK
    } else {
        process.env.NEXT_PUBLIC_SITE_LINK = siteLink
    }

    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const helpers = require('./helpers') as typeof import('./helpers')

        result = helpers.createPageUrl(language, path)
    })

    if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_LINK
    } else {
        process.env.NEXT_PUBLIC_SITE_LINK = previous
    }

    return result
}

describe('helpers', () => {
    describe('createPageUrl', () => {
        const base = SITE_LINK ?? ''

        it('prepends the en/ prefix for English', () => {
            expect(createPageUrl('en', 'starmap')).toBe(`${base}en/starmap`)
        })

        it('uses no prefix for Russian (default locale)', () => {
            expect(createPageUrl('ru', 'starmap')).toBe(`${base}starmap`)
        })

        it('strips a leading slash from the path', () => {
            expect(createPageUrl('ru', '/starmap')).toBe(`${base}starmap`)
        })

        it('returns the locale root when no path is given', () => {
            expect(createPageUrl('en')).toBe(`${base}en/`)
            expect(createPageUrl('ru')).toBe(base)
        })

        it('does not depend on SITE_LINK having a trailing slash', () => {
            expect(createPageUrlWithSiteLink('https://example.test', 'en', 'starmap')).toBe(
                'https://example.test/en/starmap'
            )
            expect(createPageUrlWithSiteLink('https://example.test/', 'en', 'starmap')).toBe(
                'https://example.test/en/starmap'
            )
            expect(createPageUrlWithSiteLink('https://example.test', 'ru')).toBe('https://example.test/')
            // Unset: relative URLs, no stray slash
            expect(createPageUrlWithSiteLink(undefined, 'ru', '/starmap')).toBe('starmap')
        })
    })

    describe('round', () => {
        it('rounds to the requested digits (4 by default)', () => {
            expect(round(3.14159265)).toBe(3.1416)
            expect(round(3.14159265, 2)).toBe(3.14)
            expect(round(-1.005, 1)).toBe(-1)
        })

        it('treats zero as a value, not as absent', () => {
            expect(round(0)).toBe(0)
            expect(round(0, 2)).toBe(0)
        })

        it('returns undefined only for an absent value', () => {
            expect(round(undefined)).toBeUndefined()
            expect(round(null)).toBeUndefined()
            expect(round(NaN)).toBeUndefined()
        })
    })

    describe('toJsonLd', () => {
        it('serializes the object as JSON', () => {
            expect(toJsonLd({ '@type': 'Thing', name: 'Vega' })).toBe('{"@type":"Thing","name":"Vega"}')
        })

        it('escapes "<" so a string can never close the script tag', () => {
            const html = toJsonLd({ name: '</script><script>alert(1)</script>' })

            expect(html).not.toContain('<')
            expect(html).toContain('\\u003c/script>')
            // The escape is transparent to a JSON parser
            expect(JSON.parse(html)).toStrictEqual({ name: '</script><script>alert(1)</script>' })
        })
    })

    describe('formatSecondsToExposure', () => {
        it('returns "0" for 0 seconds', () => {
            expect(formatSecondsToExposure(0)).toBe('0')
        })

        it('returns "0" for negative values', () => {
            expect(formatSecondsToExposure(-60)).toBe('0')
        })

        it('formats sub-minute value as "00:00"', () => {
            expect(formatSecondsToExposure(45)).toBe('00:00')
        })

        it('formats exactly 1 minute as "00:01"', () => {
            expect(formatSecondsToExposure(60)).toBe('00:01')
        })

        it('formats exactly 1 hour as "01:00"', () => {
            expect(formatSecondsToExposure(3600)).toBe('01:00')
        })

        it('formats values greater than 1 hour', () => {
            expect(formatSecondsToExposure(7384)).toBe('02:03')
        })

        it('accepts a string input', () => {
            expect(formatSecondsToExposure('3600')).toBe('01:00')
        })

        it('returns "0" for string "0"', () => {
            expect(formatSecondsToExposure('0')).toBe('0')
        })

        it('formats full mode for 0 seconds returns "0"', () => {
            expect(formatSecondsToExposure(0, true)).toBe('0')
        })

        it('formats sub-minute value in full mode as empty string (no hours or minutes)', () => {
            expect(formatSecondsToExposure(45, true)).toBe('')
        })

        it('formats exactly 1 minute in full mode', () => {
            expect(formatSecondsToExposure(60, true)).toBe('1 минута')
        })

        it('formats exactly 1 hour in full mode', () => {
            expect(formatSecondsToExposure(3600, true)).toBe('1 час ')
        })

        it('formats 2 hours 3 minutes in full mode', () => {
            expect(formatSecondsToExposure(7384, true)).toBe('2 часа 3 минуты')
        })

        it('formats 5 hours in full mode', () => {
            expect(formatSecondsToExposure(18000, true)).toBe('5 часов ')
        })
    })

    describe('getTimeFromSec', () => {
        it('returns "0" for 0 seconds', () => {
            expect(getTimeFromSec(0)).toBe('0')
        })

        it('returns "0" for negative values', () => {
            expect(getTimeFromSec(-1)).toBe('0')
        })

        it('formats sub-minute value as "00:00"', () => {
            expect(getTimeFromSec(30)).toBe('00:00')
        })

        it('formats exactly 1 minute as "00:01"', () => {
            expect(getTimeFromSec(60)).toBe('00:01')
        })

        it('formats exactly 1 hour as "01:00"', () => {
            expect(getTimeFromSec(3600)).toBe('01:00')
        })

        it('formats values greater than 1 hour', () => {
            expect(getTimeFromSec(7384)).toBe('02:03')
        })

        it('delegates to formatSecondsToExposure in full mode', () => {
            expect(getTimeFromSec(7384, true)).toBe(formatSecondsToExposure(7384, true))
        })
    })
})
