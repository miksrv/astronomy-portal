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
    // The dictionary is split by section (see NAMESPACE_PREFIXES in
    // i18next-scanner.config.js): a key is looked up in `translation` first and then
    // in whichever of these the page loaded, so a key such as `pages.photos.title`
    // needs no namespace in the code. A namespace the page did not load simply yields the
    // key's default text.
    fallbackNS: ['stargazing', 'objects', 'photos', 'observatory', 'starmap', 'admin', 'about', 'privacy'],
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
