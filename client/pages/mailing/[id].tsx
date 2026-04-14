import React from 'react'
import { getCookie } from 'cookies-next'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'

import styles from './styles.module.sass'

const MailingStatsPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const { id } = router.query as { id: string }

    const { data, isLoading } = API.useMailingGetItemQuery(id, {
        pollingInterval: undefined,
        skip: !id
    })

    // Poll every 30 seconds while the campaign is still sending
    API.useMailingGetItemQuery(id, {
        pollingInterval: data?.status === 'sending' ? 30000 : undefined,
        skip: !id || data?.status !== 'sending'
    })

    const pageTitle = data?.subject ?? t('pages.mailing.title', 'Рассылки')

    const remaining = data && data.totalCount > 0 ? data.totalCount - data.sentCount - data.errorCount : 0

    const sentPct = data && data.totalCount > 0 ? (data.sentCount / data.totalCount) * 100 : 0
    const errorPct = data && data.totalCount > 0 ? (data.errorCount / data.totalCount) * 100 : 0

    const statusLabel = (status: ApiModel.MailingStatus): string => {
        const map: Record<ApiModel.MailingStatus, string> = {
            completed: t('pages.mailing.status-completed', 'Завершена'),
            draft: t('pages.mailing.status-draft', 'Черновик'),
            paused: t('pages.mailing.status-paused', 'Приостановлена'),
            sending: t('pages.mailing.status-sending', 'Отправляется')
        }

        return map[status]
    }

    return (
        <AppLayout
            title={pageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={pageTitle}
                currentPage={pageTitle}
                links={[{ link: '/mailing', text: t('pages.mailing.title', 'Рассылки') }]}
            />

            <Container
                className={styles.statsContainer}
                style={{ marginBottom: '10px' }}
            >
                {isLoading && <p>{'...'}</p>}

                {!isLoading && data && (
                    <>
                        <div className={styles.statsHeader}>
                            <dl className={styles.metaGrid}>
                                <dt>{'Subject'}</dt>
                                <dd>{data.subject}</dd>
                                <dt>{'Status'}</dt>
                                <dd>{statusLabel(data.status)}</dd>
                                {data.sentAt && (
                                    <>
                                        <dt>{'Sent at'}</dt>
                                        <dd>{new Date(data.sentAt.date).toLocaleString()}</dd>
                                    </>
                                )}
                                <dt>{'Created at'}</dt>
                                <dd>{new Date(data.createdAt.date).toLocaleString()}</dd>
                            </dl>
                        </div>

                        {data.totalCount > 0 && (
                            <>
                                <div
                                    className={styles.progressBar}
                                    role={'progressbar'}
                                    aria-valuenow={data.sentCount}
                                    aria-valuemax={data.totalCount}
                                >
                                    <div
                                        className={styles.progressSent}
                                        style={{ width: `${sentPct}%` }}
                                    />
                                    <div
                                        className={styles.progressErrors}
                                        style={{ width: `${errorPct}%` }}
                                    />
                                </div>

                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <span className={`${styles.statValue} ${styles.statTotal}`}>
                                            {data.totalCount}
                                        </span>
                                        <span className={styles.statLabel}>
                                            {t('pages.mailing.stats-total', 'Всего')}
                                        </span>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={`${styles.statValue} ${styles.statSent}`}>
                                            {data.sentCount}
                                        </span>
                                        <span className={styles.statLabel}>
                                            {t('pages.mailing.stats-sent', 'Отправлено')}
                                        </span>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={`${styles.statValue} ${styles.statErrors}`}>
                                            {data.errorCount}
                                        </span>
                                        <span className={styles.statLabel}>
                                            {t('pages.mailing.stats-errors', 'Ошибок')}
                                        </span>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={`${styles.statValue} ${styles.statRemaining}`}>
                                            {remaining}
                                        </span>
                                        <span className={styles.statLabel}>{'Remaining'}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </Container>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const locale = context.locale ?? 'en'
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { redirect: { destination: '/', permanent: false } }
            }

            const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (authData?.user?.role !== ApiModel.UserRole.ADMIN) {
                return { redirect: { destination: '/', permanent: false } }
            }

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default MailingStatsPage
