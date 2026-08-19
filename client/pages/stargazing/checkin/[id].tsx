import React, { useEffect } from 'react'
import { getCookie } from 'cookies-next'
import { Container, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppLayout, AppToolbar } from '@/components/common'
import { CheckinResult, CheckinResultStatus } from '@/components/pages/stargazing'
import { DEFAULT_LOCALE } from '@/utils/constants'

/**
 * Landing page for a ticket's QR code (`/stargazing/checkin/:id`), opened by
 * any camera app — not just the staff scanner in {@see CheckinPage}. Always
 * calls the same `events/checkin/:id` endpoint; the backend itself decides
 * what the caller is allowed to see:
 * - Staff: performs the check-in and this page shows the result.
 * - Anyone else (typically the guest scanning their own ticket): the
 *   response only carries the event id, so this page just redirects there —
 *   a friendly reminder rather than a dead end.
 * - Any error (not logged in, someone else's booking, invalid id): redirect
 *   to the stargazing hub.
 */
const CheckinIdPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()
    const id = typeof router.query.id === 'string' ? router.query.id : undefined

    const [checkin, { data, isError, isSuccess }] = API.useEventGetCheckinMutation()

    useEffect(() => {
        if (id) {
            void checkin(id)
        }
    }, [id])

    useEffect(() => {
        if (isSuccess && data?.eventId) {
            void router.replace(`/stargazing/${data.eventId}`)
        }

        if (isError) {
            void router.replace('/stargazing')
        }
    }, [isSuccess, isError, data])

    const showResult = isSuccess && !data?.eventId

    return (
        <AppLayout
            title={t('pages.checkin.title', 'Проверка участников')}
            nofollow={true}
            noindex={true}
        >
            <AppToolbar
                title={t('pages.checkin.title', 'Проверка участников')}
                currentPage={t('pages.checkin.title', 'Проверка участников')}
                links={[
                    {
                        link: '/stargazing',
                        text: t('menu.stargazing', 'Астровыезды')
                    }
                ]}
            />

            <Container>
                {!showResult && (
                    <div style={{ padding: '60px 0', textAlign: 'center' }}>
                        <Spinner />
                    </div>
                )}

                {showResult && (
                    <CheckinResult
                        status={data?.checkin?.date ? CheckinResultStatus.DUPLICATE : CheckinResultStatus.SUCCESS}
                        message={t('pages.checkin.participant-registered', 'Участник зарегистрирован')}
                        name={data?.name}
                        adults={data?.members?.adults}
                        children={data?.members?.children}
                        continueLabel={t('pages.checkin.open-scanner', 'Сканировать ещё')}
                        continueLink={'/stargazing/checkin'}
                    />
                )}
            </Container>
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const locale = context.locale ?? DEFAULT_LOCALE
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            }

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default CheckinIdPage
