// The reserved, hardcoded "Разработчик" role seeded by the roles migration
// (server: RolesModel::DEVELOPER_ROLE_ID) — the only role allowed to hold
// Permission.USERS_MANAGE, and the only role allowed to be assigned to just
// one user at a time. Used by the admin roles/users UI to lock down the
// corresponding controls instead of relying solely on the API's rejection.
export const DEVELOPER_ROLE_ID = 1

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

// DOM id of the fixed cookie-consent banner and the custom event it fires when
// dismissed, so other fixed/floating bottom UI (e.g. the review reminder) can
// read its rendered height and avoid overlapping it.
export const COOKIE_CONSENT_BANNER_ID = 'cookie-consent-banner'
export const COOKIE_CONSENT_DISMISSED_EVENT = 'cookie-consent:dismissed'

// Cookie name prefix (per event id) used to remember that a user closed the
// floating "leave a review" reminder, and how long that dismissal lasts
// before the reminder is shown again.
export const REVIEW_PROMPT_DISMISS_COOKIE_PREFIX = 'reviewPromptDismissed_'
export const REVIEW_PROMPT_DISMISS_DURATION = 24 * 60 * 60 // seconds (24 hours)

// DOM id of the permanent in-page review form, so the floating reminder can
// hide itself while that form is visible on screen (no point showing both at
// once) and reappear once it's scrolled out of view again.
export const REVIEW_INLINE_FORM_ID = 'event-review-inline-form'

// Number of reviews fetched per page in EventReviews' infinite scroll.
export const REVIEWS_PAGE_SIZE = 10
