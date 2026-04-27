import React, { useEffect, useState } from 'react'
import { getCookie } from 'cookies-next'
import { Container } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'

import { API, ApiModel, HOST_IMG, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

const MailingStatsPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const { id } = router.query as { id: string }

    const { data, isLoading, isError } = API.useMailingGetItemQuery(id, {
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

    const isDayLimitHit = !!data && data.sentToday >= data.limitDay
    const isHourLimitHit = !!data && data.sentThisHour >= data.limitHour
    const isLimitHit = isDayLimitHit || isHourLimitHit

    const [countdown, setCountdown] = useState('')

    useEffect(() => {
        if (!isLimitHit || data?.status !== 'sending' || remaining <= 0) {
            setCountdown('')
            return
        }

        const getTarget = (): Date => {
            const now = new Date()
            if (isDayLimitHit) {
                const midnight = new Date(now)
                midnight.setHours(24, 0, 0, 0)
                return midnight
            }
            const nextHour = new Date(now)
            nextHour.setHours(now.getHours() + 1, 0, 0, 0)
            return nextHour
        }

        const formatCountdown = (ms: number): string => {
            const totalSeconds = Math.max(0, Math.floor(ms / 1000))
            const h = Math.floor(totalSeconds / 3600)
            const m = Math.floor((totalSeconds % 3600) / 60)
            const s = totalSeconds % 60
            return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
        }

        const tick = () => {
            const now = new Date()
            const target = getTarget()
            setCountdown(formatCountdown(target.getTime() - now.getTime()))
        }

        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [isLimitHit, isDayLimitHit, data?.status, remaining])

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

            <Container>
                {!isLoading && !isError && data && (
                    <>
                        <div className={styles.statsHeader}>
                            <dl className={styles.metaGrid}>
                                <dt>{t('pages.mailing.detail-subject', 'Тема')}</dt>
                                <dd>{data.subject}</dd>
                                <dt>{t('pages.mailing.detail-status', 'Статус')}</dt>
                                <dd>
                                    <span
                                        className={
                                            styles[
                                                `status${data.status.charAt(0).toUpperCase()}${data.status.slice(1)}`
                                            ]
                                        }
                                    >
                                        {statusLabel(data.status)}
                                    </span>
                                </dd>
                                {data.sentAt && (
                                    <>
                                        <dt>{t('pages.mailing.detail-sent-at', 'Дата отправки')}</dt>
                                        <dd>{formatDate(data.sentAt.date)}</dd>
                                    </>
                                )}
                                <dt>{t('pages.mailing.detail-created-at', 'Дата создания')}</dt>
                                <dd>{formatDate(data.createdAt.date)}</dd>
                            </dl>

                            <dl className={styles.metaGrid}>
                                <dt>{t('pages.mailing.limit-day', 'Лимит в сутки')}</dt>
                                <dd>
                                    {data.sentToday} / {data.limitDay}
                                </dd>
                                <dt>{t('pages.mailing.limit-hour', 'Лимит в час')}</dt>
                                <dd>
                                    {data.sentThisHour} / {data.limitHour}
                                </dd>
                                <dt>{t('pages.mailing.limit-status', 'Состояние лимита')}</dt>
                                <dd>
                                    {isDayLimitHit ? (
                                        <span className={styles.limitHit}>
                                            {t('pages.mailing.limit-day-hit', 'Суточный лимит')}
                                        </span>
                                    ) : isHourLimitHit ? (
                                        <span className={styles.limitHit}>
                                            {t('pages.mailing.limit-hour-hit', 'Часовой лимит')}
                                        </span>
                                    ) : (
                                        <span className={styles.limitOk}>
                                            {t('pages.mailing.limit-active', 'Активна')}
                                        </span>
                                    )}
                                </dd>
                                {isLimitHit && data.status === 'sending' && remaining > 0 && countdown && (
                                    <>
                                        <dt>{t('pages.mailing.limit-reset', 'Сброс через')}</dt>
                                        <dd>
                                            <span className={styles.countdown}>{countdown}</span>
                                        </dd>
                                    </>
                                )}
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
                                        <span className={styles.statLabel}>
                                            {t('pages.mailing.stats-remaining', 'Осталось')}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {data.image && (
                            <div className={styles.imagePreview}>
                                <Image
                                    src={HOST_IMG + data.image}
                                    alt={data.subject}
                                    width={300}
                                    height={200}
                                />
                            </div>
                        )}

                        <div className={styles.contentPreview}>{data.content}</div>
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
            const id = context.params?.id as string
            const translations = await serverSideTranslations(locale)
            const token = await getCookie('token', { req: context.req, res: context.res })

            store.dispatch(setLocale(locale))

            if (token) {
                store.dispatch(setSSRToken(token))
            } else {
                return { redirect: { destination: '/', permanent: false } }
            }

            const { data: authData } = await store.dispatch(API.endpoints.authGetMe.initiate())

            if (authData?.user?.role !== ApiModel.UserRole.ADMIN) {
                return { redirect: { destination: '/', permanent: false } }
            }

            const { data: mailingData } = await store.dispatch(API.endpoints.mailingGetItem.initiate(id))

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (!mailingData) {
                return { notFound: true }
            }

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default MailingStatsPage
