const path = require('path')

/**
 * @type {import('next-i18next/pages').UserConfig}
 */
module.exports = {
    // https://www.i18next.com/overview/configuration-options#logging
    // debug: process.env.NODE_ENV === 'development',
    debug: false,
    i18n: {
        defaultLocale: 'ru',
        locales: ['ru', 'en'],
        // Disabled: Next's built-in Accept-Language redirect served different
        // content/redirects to crawlers depending on their header, which is bad
        // for SEO. Locale preference is now handled explicitly in middleware.ts
        // based solely on the NEXT_LOCALE cookie set by the language switcher.
        localeDetection: false
    },
    defaultNS: 'translation',
    localePath: path.resolve('./public/locales'),
    reloadOnPrerender: process.env.NODE_ENV === 'development'
    /**
     * @link https://github.com/i18next/next-i18next#6-advanced-configuration
     */
    // saveMissing: false,
    // strictMode: true,
    // serializeConfig: false,
    // react: { useSuspense: false }
}
