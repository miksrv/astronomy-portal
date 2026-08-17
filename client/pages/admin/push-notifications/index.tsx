import React, { useState } from 'react'
import { Badge, Button, Container, Dialog, Table, TableColumnProps } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel, wrapper } from '@/api'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { requirePermissionSSR } from '@/utils/adminAuth'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

const statusColorMap: Record<ApiModel.PushNotificationStatus, string> = {
    completed: styles.statusCompleted,
    draft: styles.statusDraft,
    paused: styles.statusPaused,
    sending: styles.statusSending
}

const PushNotificationListPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const { data, isLoading } = API.usePushNotificationGetListQuery()

    const [deletePushNotification, { isLoading: deleteLoading }] = API.usePushNotificationDeleteMutation()

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | undefined>()

    const pageTitle = t('pages.push-notifications.title', 'Push-уведомления')

    const statusLabel = (status: ApiModel.PushNotificationStatus): string => {
        const map: Record<ApiModel.PushNotificationStatus, string> = {
            completed: t('pages.push-notifications.status-completed', 'Завершена'),
            draft: t('pages.push-notifications.status-draft', 'Черновик'),
            paused: t('pages.push-notifications.status-paused', 'Приостановлена'),
            sending: t('pages.push-notifications.status-sending', 'Отправляется')
        }

        return map[status]
    }

    const handleDeleteConfirm = async () => {
        if (!confirmDeleteId) {
            return
        }

        await deletePushNotification(confirmDeleteId)
        setConfirmDeleteId(undefined)
    }

    const tableColumns: Array<TableColumnProps<ApiModel.PushNotificationListItem>> = [
        {
            accessor: 'title',
            className: styles.titleCell,
            header: t('pages.push-notifications.col-title', 'Заголовок'),
            formatter: (_data, row, i) => <Link href={`/admin/push-notifications/${row[i].id}`}>{row[i].title}</Link>,
            isSortable: true
        },
        {
            accessor: 'status',
            header: t('pages.push-notifications.col-status', 'Статус'),
            formatter: (data) => (
                <Badge
                    className={statusColorMap[data as ApiModel.PushNotificationStatus]}
                    label={statusLabel(data as ApiModel.PushNotificationStatus)}
                    size={'small'}
                />
            ),
            isSortable: true
        },
        {
            accessor: 'totalCount',
            header: t('pages.push-notifications.stats-total', 'Всего'),
            isSortable: true
        },
        {
            accessor: 'sentCount',
            header: t('pages.push-notifications.stats-sent', 'Отправлено'),
            isSortable: true
        },
        {
            accessor: 'errorCount',
            header: t('pages.push-notifications.stats-errors', 'Ошибок'),
            isSortable: true
        },
        {
            accessor: 'createdAt',
            className: styles.dateCell,
            header: t('pages.push-notifications.col-date', 'Дата'),
            formatter: (_data, row, i) => {
                const item = row[i]

                return item.sentAt
                    ? formatDate(item.sentAt.date, 'DD.MM.YYYY, HH:mm')
                    : formatDate(item.createdAt.date, 'DD.MM.YYYY, HH:mm')
            },
            isSortable: true
        },
        {
            accessor: 'id',
            header: '',
            formatter: (_data, row, i) => (
                <div className={styles.actionsCell}>
                    {row[i].status === 'draft' && (
                        <>
                            <Link href={`/admin/push-notifications/form?id=${row[i].id}`}>
                                <Button
                                    size={'small'}
                                    icon={'Pencil'}
                                    mode={'secondary'}
                                />
                            </Link>
                            <Button
                                size={'small'}
                                icon={'Close'}
                                variant={'negative'}
                                mode={'primary'}
                                onClick={() => setConfirmDeleteId(row[i].id)}
                            />
                        </>
                    )}
                </div>
            )
        }
    ]

    return (
        <AppLayout
            title={pageTitle}
            noindex={true}
            nofollow={true}
        >
            <AppToolbar
                title={pageTitle}
                currentPage={pageTitle}
            >
                <Button
                    mode={'secondary'}
                    icon={'PlusCircle'}
                    link={'/admin/push-notifications/form'}
                    label={t('pages.push-notifications.create', 'Новое уведомление')}
                />
            </AppToolbar>

            <Container className={styles.tableContainer}>
                <Table<ApiModel.PushNotificationListItem>
                    className={styles.pushTable}
                    size={'small'}
                    columns={tableColumns}
                    data={data?.items || []}
                    loading={isLoading}
                    stickyHeader={true}
                    defaultSort={{ direction: 'desc', key: 'createdAt' }}
                    noDataCaption={t('pages.push-notifications.no-items', 'Push-уведомлений пока нет')}
                />
            </Container>

            <Dialog
                title={t('pages.push-notifications.delete-confirm-title', 'Удалить черновик?')}
                open={Boolean(confirmDeleteId)}
                showOverlay={true}
                showCloseButton={true}
                onCloseDialog={() => setConfirmDeleteId(undefined)}
            >
                <p>
                    {t(
                        'pages.push-notifications.delete-confirm-text',
                        'Это действие нельзя отменить. Черновик будет удалён безвозвратно.'
                    )}
                </p>
                <div className={styles.modalActions}>
                    <Button
                        mode={'secondary'}
                        label={t('pages.push-notifications.cancel', 'Отмена')}
                        onClick={() => setConfirmDeleteId(undefined)}
                    />
                    <Button
                        mode={'primary'}
                        label={t('common.delete', 'Удалить')}
                        onClick={handleDeleteConfirm}
                        loading={deleteLoading}
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
            const guard = await requirePermissionSSR(store, context, ApiModel.Permission.PUSH_MANAGE)

            if (!guard.ok) {
                return { redirect: guard.redirect }
            }

            await Promise.all(store.dispatch(API.util.getRunningQueriesThunk()))

            return {
                props: {
                    ...guard.translations
                }
            }
        }
)

export default PushNotificationListPage
