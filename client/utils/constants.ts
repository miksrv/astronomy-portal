export const LOCAL_STORAGE_KEY = 'astro'

export const LOCAL_STORAGE = {
    AUTH_TOKEN: 'token',
    COOKIE_CONSENT: 'cookieConsent',
    LOCALE: 'locale',
    RETURN_PATH: 'returnPath'
}

// sessionStorage key: the last submitted event-registration form data, saved
// right before redirecting to the bank so a declined/failed payment can be
// retried (new order) from the /stargazing/payment page without re-filling
// the booking form. Cleared once no longer needed.
export const STARGAZING_RETRY_STORAGE_KEY = 'astro:lastBookingAttempt'

export const SITE_LINK = process.env.NEXT_PUBLIC_SITE_LINK

export const HOST_API = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080/'

export const HOST_IMG = process.env.NEXT_PUBLIC_IMG_HOST || HOST_API

// Approximate number of stargazing participants from the years before the
// registration system existed. Added on top of the registered count so the
// landing page and the /stargazing section show the same total.
export const STARGAZING_LEGACY_MEMBERS = 50000

// The community has been running astronomy activities since this year; used to
// derive the "years in astronomy" counter (chosen so it currently reads 11).
export const STARGAZING_FOUNDING_YEAR = 2015

// Google OAuth is disabled to comply with Russian Federation legislation
// (foreign authentication services restriction effective March 2025).
// Set to true to re-enable the Google login button.
export const AUTH_GOOGLE_ENABLED = false
