import { getCookie } from 'cookies-next'

import { GetServerSidePropsContext } from 'next'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, setLocale } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import type { AppStore } from '@/api/store'

type SSRTranslations = Awaited<ReturnType<typeof serverSideTranslations>>

export type PermissionGuardResult =
    { ok: false; redirect: { destination: string; permanent: false } } | { ok: true; translations: SSRTranslations }

/**
 * Shared `getServerSideProps` guard for any page restricted to users holding
 * a given privilege, redirecting to `redirectTo` (default `/`) otherwise.
 * Dispatches `setLocale`/`setSSRToken` and fetches `authGetMe` as a side effect,
 * so callers can rely on `state.auth.user` being populated afterwards.
 *
 * Callers still own their own page-specific data fetching and the final
 * `getRunningQueriesThunk()` call, since those must run *after* this guard passes.
 */
export const requirePermissionSSR = async (
    store: AppStore,
    context: GetServerSidePropsContext,
    /** A single required privilege, or a list — any one of which is enough. */
    permission: ApiModel.Permission | ApiModel.Permission[],
    redirectTo = '/'
): Promise<PermissionGuardResult> => {
    const locale = context.locale ?? 'en'
    const translations = await serverSideTranslations(locale)
    const token = await getCookie('token', { req: context.req, res: context.res })

    store.dispatch(setLocale(locale))

    if (!token) {
        return { ok: false, redirect: { destination: redirectTo, permanent: false } }
    }

    store.dispatch(setSSRToken(token))

    const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

    const required = Array.isArray(permission) ? permission : [permission]
    const granted = authData?.user?.permissions ?? []

    if (!required.some((item) => granted.includes(item))) {
        return { ok: false, redirect: { destination: redirectTo, permanent: false } }
    }

    return { ok: true, translations }
}
