import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { setLocale } from '@/api'
import type { AppStore } from '@/api/store'
import { DEFAULT_LOCALE } from '@/utils/constants'

type SSRTranslations = Awaited<ReturnType<typeof serverSideTranslations>>

export interface SSRLocaleResult {
    locale: string
    translations: SSRTranslations
}

/**
 * Shared `getServerSideProps`/`getStaticProps` prelude for public pages:
 * resolves the request locale (falling back to `DEFAULT_LOCALE`), loads its
 * i18n translations, and dispatches `setLocale` so the store matches what SSR
 * is about to render. Mirrors `requirePermissionSSR` (`@/utils/adminAuth`) for
 * admin pages, minus the auth/permission check.
 *
 * `context` only needs a `locale` field, so this works for both
 * `GetServerSidePropsContext` and `GetStaticPropsContext` callers.
 *
 * Callers still own the rest of their props function — token/auth handling,
 * page-specific data fetching, and the final `getRunningQueriesThunk()` call
 * — since those must run *after* this.
 */
export const initSSRLocale = async (
    store: AppStore,
    context: { locale?: string },
    namespaces?: string[]
): Promise<SSRLocaleResult> => {
    const locale = context.locale ?? DEFAULT_LOCALE
    const translations = await serverSideTranslations(locale, namespaces)

    store.dispatch(setLocale(locale))

    return { locale, translations }
}
