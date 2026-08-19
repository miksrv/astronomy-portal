import { NextRequest, NextResponse } from 'next/server'

// Locale redirects happen here, at the edge, so they occur before any HTML is
// generated. This avoids the client-side flash of a "second load" that a
// useEffect-based redirect would cause, and it never redirects based on the
// Accept-Language header, so crawlers without a NEXT_LOCALE cookie always see
// stable, consistent content at the un-prefixed (default locale) URL.

const LOCALES = ['ru', 'en'] as const
const DEFAULT_LOCALE = 'ru'

const PUBLIC_FILE = /\.[^/]+$/

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (
        pathname.startsWith('/_next') ||
        pathname === '/robots.txt' ||
        pathname === '/sitemap.xml' ||
        PUBLIC_FILE.test(pathname)
    ) {
        return NextResponse.next()
    }

    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value

    if (!cookieLocale || !LOCALES.includes(cookieLocale as (typeof LOCALES)[number])) {
        return NextResponse.next()
    }

    // `request.nextUrl.pathname` is always already locale-stripped by Next's
    // own i18n routing (it never contains the `/en` prefix, even when the
    // request URL has one) — the actually detected locale lives on
    // `request.nextUrl.locale`. Deriving it by hand from `pathname` (the old
    // approach here) silently always resolved to `DEFAULT_LOCALE`, which for
    // e.g. `/en/objects` made this redirect to `/en/objects` — itself — an
    // infinite loop.
    const currentLocale = request.nextUrl.locale || DEFAULT_LOCALE

    if (currentLocale === cookieLocale) {
        return NextResponse.next()
    }

    const url = request.nextUrl.clone()
    // Setting `.locale` (rather than hand-building `pathname`) lets Next's
    // own `NextURL` add/remove the `/en` prefix correctly when the redirect
    // response formats the `Location` header.
    url.locale = cookieLocale

    return NextResponse.redirect(url, 307)
}

export const config = {
    matcher: ['/((?!_next).*)']
}
