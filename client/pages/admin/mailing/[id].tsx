import React, { useEffect, useState } from 'react'
import { Button, Container, Dialog } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { MailingPreview } from '@/components/pages/mailing'
import { requirePermissionSSR } from '@/utils/adminAuth'
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

    const [cancelMailing, { isLoading: cancelLoading }] = API.useMailingCancelMutation()

    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    const isCancelable = data?.status === 'draft' || data?.status === 'sending'

    const handleCancelConfirm = async () => {
        if (!id) {
            return
        }

        await cancelMailing(id)
        setShowCancelConfirm(false)
    }

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
            canceled: t('pages.mailing.status-canceled', 'Отменена'),
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
                links={[{ link: '/admin/mailing', text: t('pages.mailing.title', 'Рассылки') }]}
            >
                {isCancelable && (
                    <Button
                        icon={'Close'}
                        mode={'primary'}
                        variant={'negative'}
                        label={t('pages.mailing.cancel-mailing', 'Отменить рассылку')}
                        onClick={() => setShowCancelConfirm(true)}
                    />
                )}
            </AppToolbar>

            <Container>
                {!isLoading && !isError && data && (
                    <>
                        <div className={styles.statsHeader}>
                            <dl className={styles.metaGrid}>
                                <dt>{t('pages.mailing.detail-subject', 'Тема')}</dt>
                                <dd>{data.subject}</dd>
                                {data.audienceType !== undefined && (
                                    <>
                                        <dt>{t('pages.mailing.detail-audience', 'Аудитория')}</dt>
                                        <dd>
                                            {router.locale === 'ru' ? data.audienceLabelRu : data.audienceLabelEn}
                                            {data.audienceCount !== undefined && ` (${String(data.audienceCount)})`}
                                        </dd>
                                    </>
                                )}
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
                                <dt>{t('pages.mailing.limit-day', 'Лимит в сутки')}</dt>
                                <dd>
                                    {data.sentToday} / {data.limitDay}
                                </dd>
                                <dt>{t('pages.mailing.limit-hour', 'Лимит в час')}</dt>
                                <dd>
                                    {data.sentThisHour} / {data.limitHour}
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

                        <MailingPreview mailingId={id} />
                    </>
                )}
            </Container>

            <Dialog
                title={t('pages.mailing.cancel-confirm-title', 'Отменить рассылку?')}
                open={showCancelConfirm}
                showOverlay={true}
                showCloseButton={true}
                onCloseDialog={() => setShowCancelConfirm(false)}
            >
                <p>
                    {t(
                        'pages.mailing.cancel-confirm-text',
                        'Рассылка будет отменена. Уже отправленные письма отозвать не удастся, но оставшиеся получатели его не получат. Отменить это действие будет невозможно.'
                    )}
                </p>
                <div className={styles.modalActions}>
                    <Button
                        mode={'secondary'}
                        label={t('pages.mailing.cancel', 'Отмена')}
                        onClick={() => setShowCancelConfirm(false)}
                    />
                    <Button
                        mode={'primary'}
                        variant={'negative'}
                        label={t('pages.mailing.cancel-mailing', 'Отменить рассылку')}
                        onClick={handleCancelConfirm}
                        loading={cancelLoading}
                    />
                </div>
            </Dialog>

            <AppFooter />
        </AppLayout>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<object>> => {
            const id = context.params?.id as string
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.MAILINGS_MANAGE)

            if (!guard.ok) {
                return { redirect: guard.redirect }
            }

            const { data: mailingData } = await store.dispatch(API.endpoints.mailingGetItem.initiate(id))

            // Prefetched alongside the mailing itself so the inbox preview iframe
            // has its HTML ready on first paint instead of popping in client-side.
            await store.dispatch(API.endpoints.mailingGetPreview.initiate(id))

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (!mailingData) {
                return { notFound: true }
            }

            return {
                props: {
                    ...guard.translations
                }
            }
        }
)

export default MailingStatsPage
