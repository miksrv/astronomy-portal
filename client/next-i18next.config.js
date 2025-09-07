const path = require('path')

/**
 * @type {import('next-i18next').UserConfig}
 */
module.exports = {
    // https://www.i18next.com/overview/configuration-options#logging
    // debug: process.env.NODE_ENV === 'development',
    debug: false,
    i18n: {
        defaultLocale: 'ru',
        locales: ['ru', 'en']
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
