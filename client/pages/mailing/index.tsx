import React, { useState } from 'react'
import { getCookie } from 'cookies-next'
import { Badge, Button, Container, Dialog, Table, TableColumnProps } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { API, ApiModel, setLocale, wrapper } from '@/api'
import { setSSRToken } from '@/api/authSlice'
import { AppFooter, AppLayout, AppToolbar } from '@/components/common'
import { formatDate } from '@/utils/dates'

import styles from './styles.module.sass'

const statusColorMap: Record<ApiModel.MailingStatus, string> = {
    completed: styles.statusCompleted,
    draft: styles.statusDraft,
    paused: styles.statusPaused,
    sending: styles.statusSending
}

const MailingListPage: NextPage<object> = () => {
    const { t } = useTranslation()

    const { data, isLoading } = API.useMailingGetListQuery()

    const [deleteMailing, { isLoading: deleteLoading }] = API.useMailingDeleteMutation()

    const [confirmDeleteId, setConfirmDeleteId] = useState<string | undefined>()

    const pageTitle = t('pages.mailing.title', 'Рассылки')

    const statusLabel = (status: ApiModel.MailingStatus): string => {
        const map: Record<ApiModel.MailingStatus, string> = {
            completed: t('pages.mailing.status-completed', 'Завершена'),
            draft: t('pages.mailing.status-draft', 'Черновик'),
            paused: t('pages.mailing.status-paused', 'Приостановлена'),
            sending: t('pages.mailing.status-sending', 'Отправляется')
        }

        return map[status]
    }

    const handleDeleteConfirm = async () => {
        if (!confirmDeleteId) {
            return
        }

        await deleteMailing(confirmDeleteId)
        setConfirmDeleteId(undefined)
    }

    const tableColumns: Array<TableColumnProps<ApiModel.MailingListItem>> = [
        {
            accessor: 'subject',
            className: styles.subjectCell,
            header: t('pages.mailing.col-subject', 'Тема'),
            isSortable: true
        },
        {
            accessor: 'status',
            header: t('pages.mailing.col-status', 'Статус'),
            formatter: (data) => (
                <Badge
                    className={statusColorMap[data as ApiModel.MailingStatus]}
                    label={statusLabel(data as ApiModel.MailingStatus)}
                    size={'small'}
                />
            ),
            isSortable: true
        },
        {
            accessor: 'totalCount',
            header: t('pages.mailing.stats-total', 'Всего'),
            isSortable: true
        },
        {
            accessor: 'sentCount',
            header: t('pages.mailing.stats-sent', 'Отправлено'),
            isSortable: true
        },
        {
            accessor: 'errorCount',
            header: t('pages.mailing.stats-errors', 'Ошибок'),
            isSortable: true
        },
        {
            accessor: 'createdAt',
            className: styles.dateCell,
            header: t('pages.mailing.col-date', 'Дата'),
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
                    <Button
                        size={'small'}
                        icon={'BarChart'}
                        mode={'secondary'}
                        link={`/mailing/${row[i].id}`}
                    />

                    {row[i].status === 'draft' && (
                        <>
                            <Link href={`/mailing/form?id=${row[i].id}`}>
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
                    link={'/mailing/form'}
                    label={t('pages.mailing.create', 'Новая рассылка')}
                />
            </AppToolbar>

            <Container className={styles.tableContainer}>
                <Table<ApiModel.MailingListItem>
                    size={'small'}
                    columns={tableColumns}
                    data={data?.items || []}
                    loading={isLoading}
                    stickyHeader={true}
                    defaultSort={{ direction: 'desc', key: 'createdAt' }}
                    noDataCaption={t('pages.mailing.no-items', 'Рассылок пока нет')}
                />
            </Container>

            <Dialog
                title={t('pages.mailing.delete-confirm-title', 'Удалить черновик?')}
                open={Boolean(confirmDeleteId)}
                showOverlay={true}
                showCloseButton={true}
                onCloseDialog={() => setConfirmDeleteId(undefined)}
            >
                <p>
                    {t(
                        'pages.mailing.delete-confirm-text',
                        'Это действие нельзя отменить. Черновик будет удалён безвозвратно.'
                    )}
                </p>
                <div className={styles.modalActions}>
                    <Button
                        mode={'secondary'}
                        label={t('pages.mailing.cancel', 'Отмена')}
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

export default MailingListPage
