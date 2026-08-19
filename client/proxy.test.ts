/**
 * @jest-environment node
 */
// `next/server` needs the native fetch API globals (Request/Response/Headers)
// that Node provides but jsdom (this project's default test environment)
// does not.

import { NextRequest } from 'next/server'

import { proxy } from './proxy'

// Wires the same `i18n` config next.config.js derives from
// next-i18next.config.js, so `request.nextUrl.locale` resolves the way it
// does at runtime.
const nextConfig = { i18n: { locales: ['ru', 'en'], defaultLocale: 'ru' } }

const makeRequest = (url: string, cookieLocale?: string) => {
    const headers = new Headers()

    if (cookieLocale) {
        headers.set('cookie', `NEXT_LOCALE=${cookieLocale}`)
    }

    return new NextRequest(url, { nextConfig, headers })
}

const isRedirect = (response: ReturnType<typeof proxy>) => response.headers.get('location') != null

describe('proxy', () => {
    it('passes through when no NEXT_LOCALE cookie is set', () => {
        expect(isRedirect(proxy(makeRequest('http://localhost:3000/stargazing')))).toBe(false)
        expect(isRedirect(proxy(makeRequest('http://localhost:3000/en/stargazing')))).toBe(false)
    })

    it('passes through an already-prefixed path matching the cookie locale (regression: used to redirect to itself)', () => {
        const response = proxy(makeRequest('http://localhost:3000/en/stargazing', 'en'))

        expect(isRedirect(response)).toBe(false)
    })

    it('passes through an unprefixed path matching a ru cookie', () => {
        const response = proxy(makeRequest('http://localhost:3000/stargazing', 'ru'))

        expect(isRedirect(response)).toBe(false)
    })

    it('redirects an unprefixed path to the /en-prefixed one when the cookie says en', () => {
        const response = proxy(makeRequest('http://localhost:3000/stargazing', 'en'))

        expect(response.headers.get('location')).toBe('http://localhost:3000/en/stargazing')
    })

    it('redirects an /en-prefixed path to the unprefixed one when the cookie says ru', () => {
        const response = proxy(makeRequest('http://localhost:3000/en/stargazing', 'ru'))

        expect(response.headers.get('location')).toBe('http://localhost:3000/stargazing')
    })

    it('never redirects a request back to the exact URL it came from (would loop forever)', () => {
        for (const [path, cookieLocale] of [
            ['/stargazing', 'ru'],
            ['/stargazing', 'en'],
            ['/en/stargazing', 'ru'],
            ['/en/stargazing', 'en']
        ] as const) {
            const url = `http://localhost:3000${path}`
            const response = proxy(makeRequest(url, cookieLocale))

            expect(response.headers.get('location')).not.toBe(url)
        }
    })
})
