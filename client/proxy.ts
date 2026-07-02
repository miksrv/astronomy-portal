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

    const pathLocale = LOCALES.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))
    const currentLocale = pathLocale ?? DEFAULT_LOCALE

    if (currentLocale === cookieLocale) {
        return NextResponse.next()
    }

    const pathWithoutLocale = pathLocale ? pathname.slice(`/${pathLocale}`.length) || '/' : pathname
    const targetPathname = cookieLocale === DEFAULT_LOCALE ? pathWithoutLocale : `/${cookieLocale}${pathWithoutLocale}`

    const url = request.nextUrl.clone()
    url.pathname = targetPathname

    return NextResponse.redirect(url, 307)
}

export const config = {
    matcher: ['/((?!_next).*)']
}
