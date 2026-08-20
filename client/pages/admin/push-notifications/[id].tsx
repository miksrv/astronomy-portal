import React from 'react'
import { Button, Container, Message } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { formatDate } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

const PushNotificationStatsPage: NextPage<object> = () => {
    const { t } = useTranslation()
    const router = useRouter()

    const { id } = router.query as { id: string }

    const { data, isLoading, isError, error } = API.usePushNotificationGetItemQuery(id, {
        pollingInterval: undefined,
        skip: !id
    })

    // Poll every 30 seconds while the campaign is still sending
    API.usePushNotificationGetItemQuery(id, {
        pollingInterval: data?.status === 'sending' ? 30000 : undefined,
        skip: !id || data?.status !== 'sending'
    })

    const [testSend, { isLoading: testLoading, isSuccess: testSuccess, error: testError }] =
        API.usePushNotificationTestSendMutation()

    const handleTestSend = async () => {
        if (!id) {
            return
        }

        await testSend(id)
    }

    const pageTitle = data?.title ?? t('pages.push-notifications.title', 'Push-уведомления')

    const remaining = data && data.totalCount > 0 ? data.totalCount - data.sentCount - data.errorCount : 0

    const sentPct = data && data.totalCount > 0 ? (data.sentCount / data.totalCount) * 100 : 0
    const errorPct = data && data.totalCount > 0 ? (data.errorCount / data.totalCount) * 100 : 0

    const statusLabel = (status: ApiModel.PushNotificationStatus): string => {
        const map: Record<ApiModel.PushNotificationStatus, string> = {
            completed: t('pages.push-notifications.status-completed', 'Завершена'),
            draft: t('pages.push-notifications.status-draft', 'Черновик'),
            paused: t('pages.push-notifications.status-paused', 'Приостановлена'),
            sending: t('pages.push-notifications.status-sending', 'Отправляется')
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
                links={[
                    { link: '/admin/push-notifications', text: t('pages.push-notifications.title', 'Push-уведомления') }
                ]}
            >
                <Button
                    mode={'primary'}
                    label={t('pages.push-notifications.test-send', 'Отправить тест')}
                    onClick={handleTestSend}
                    loading={testLoading}
                />
            </AppToolbar>

            <Container>
                {(testError || testSuccess) && (
                    <Message
                        style={{ marginBottom: '10px' }}
                        type={testError ? 'error' : 'success'}
                    >
                        {testSuccess
                            ? t('pages.push-notifications.test-send-success', 'Тестовое уведомление отправлено')
                            : (getErrorMessage(testError) ??
                              t('pages.push-notifications.test-send-error', 'Ошибка отправки теста'))}
                    </Message>
                )}

                {!isLoading && isError && (
                    <Message type={'error'}>
                        {getErrorMessage(error) ??
                            t('pages.push-notifications.load-error', 'Не удалось загрузить уведомление')}
                    </Message>
                )}

                {!isLoading && !isError && data && (
                    <>
                        <div className={styles.statsHeader}>
                            <dl className={styles.metaGrid}>
                                <dt>{t('pages.push-notifications.detail-title', 'Заголовок')}</dt>
                                <dd>{data.title}</dd>
                                {data.audienceType !== undefined && (
                                    <>
                                        <dt>{t('pages.push-notifications.detail-audience', 'Аудитория')}</dt>
                                        <dd>
                                            {router.locale === 'ru' ? data.audienceLabelRu : data.audienceLabelEn}
                                            {data.audienceCount !== undefined && ` (${String(data.audienceCount)})`}
                                        </dd>
                                    </>
                                )}
                                {data.sentAt && (
                                    <>
                                        <dt>{t('pages.push-notifications.detail-sent-at', 'Дата отправки')}</dt>
                                        <dd>{formatDate(data.sentAt.date)}</dd>
                                    </>
                                )}
                                <dt>{t('pages.push-notifications.detail-created-at', 'Дата создания')}</dt>
                                <dd>{formatDate(data.createdAt.date)}</dd>
                            </dl>

                            <dl className={styles.metaGrid}>
                                <dt>{t('pages.push-notifications.detail-status', 'Статус')}</dt>
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
                                            {t('pages.push-notifications.stats-total', 'Всего')}
                                        </span>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={`${styles.statValue} ${styles.statSent}`}>
                                            {data.sentCount}
                                        </span>
                                        <span className={styles.statLabel}>
                                            {t('pages.push-notifications.stats-sent', 'Отправлено')}
                                        </span>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={`${styles.statValue} ${styles.statErrors}`}>
                                            {data.errorCount}
                                        </span>
                                        <span className={styles.statLabel}>
                                            {t('pages.push-notifications.stats-errors', 'Ошибок')}
                                        </span>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={`${styles.statValue} ${styles.statRemaining}`}>
                                            {remaining}
                                        </span>
                                        <span className={styles.statLabel}>
                                            {t('pages.push-notifications.stats-remaining', 'Осталось')}
                                        </span>
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
            const id = context.params?.id as string
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.PUSH_MANAGE)

            if (!guard.ok) {
                return { redirect: guard.redirect }
            }

            const { data: pushData } = await store.dispatch(API.endpoints.pushNotificationGetItem.initiate(id))

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            if (!pushData) {
                return { notFound: true }
            }

            return {
                props: {
                    ...guard.translations
                }
            }
        }
)

export default PushNotificationStatsPage
