// Manual mock of `next-i18next/pages`, applied to every test automatically (a node module
// mock next to `node_modules`, no `jest.mock()` call needed). Tests run without an i18n
// instance, so `t()` returns the Russian fallback text and interpolates `{{name}}`
// placeholders the way the real one does. `Trans` and `appWithTranslation` stay real.
type TOptions = Record<string, unknown> & { defaultValue?: string }

const actual = jest.requireActual<typeof import('next-i18next/pages')>('next-i18next/pages')

const interpolate = (text: string, options?: TOptions): string =>
    text.replace(/{{\s*(\w+)\s*}}/g, (match, name: string) =>
        options && name in options ? String(options[name]) : match
    )

const t = (key: string, fallbackOrOptions?: string | TOptions, options?: TOptions): string =>
    typeof fallbackOrOptions === 'string'
        ? interpolate(fallbackOrOptions, options)
        : interpolate(fallbackOrOptions?.defaultValue ?? key, fallbackOrOptions)

const i18n = { language: 'ru', changeLanguage: jest.fn() }

export const { appWithTranslation, Trans } = actual

export const useTranslation = () => ({ t, i18n, ready: true })
