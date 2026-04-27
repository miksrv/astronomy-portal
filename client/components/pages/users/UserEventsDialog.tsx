import React from 'react'
import { Dialog, Message, Table, TableColumnProps } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiModel } from '@/api'
import { formatDate } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'

interface UserEventsDialogProps {
    userId?: string
    userName?: string
    onClose: () => void
}

const UserEventsDialog: React.FC<UserEventsDialogProps> = ({ userId, userName, onClose }) => {
    const { t } = useTranslation()

    const { data, isFetching, error } = API.useUsersGetEventsQuery(userId!, { skip: !userId })

    const tableColumns: Array<TableColumnProps<ApiModel.AdminUserEvent>> = [
        {
            accessor: 'date',
            header: t('users.eventsColumnDate', 'Дата'),
            formatter: (data) => formatDate(data as string, 'DD MMMM YYYY')
        },
        {
            accessor: 'title',
            header: t('users.eventsColumnEvent', 'Мероприятие'),
            formatter: (data, row, i) => (
                <Link
                    href={`/stargazing/${row[i].id}`}
                    target={'_blank'}
                    rel={'noopener noreferrer'}
                >
                    {data as string}
                </Link>
            )
        },
        {
            accessor: 'adults',
            header: t('users.eventsColumnAdults', 'Взрослых')
        },
        {
            accessor: 'children',
            header: t('users.eventsColumnChildren', 'Детей')
        }
        // Future implementation of check-in feature, currently disabled due to backend limitations (lack of check-in data in the response)
        // {
        //     accessor: 'checkinAt',
        //     header: t('users.eventsColumnCheckin', 'Отметка'),
        //     formatter: (data) => (data ? `✓ ${new Date(data as string).toLocaleTimeString()}` : '—')
        // }
    ]

    return (
        <Dialog
            title={`${t('users.eventsDialogTitle', 'Мероприятия пользователя')}: ${userName}`}
            open={!!userId}
            showOverlay={true}
            showCloseButton={true}
            onCloseDialog={onClose}
            maxWidth={'700px'}
        >
            {!isFetching && error && <Message type={'error'}>{getErrorMessage(error)}</Message>}

            {!error && (
                <Table<ApiModel.AdminUserEvent>
                    size={'small'}
                    loading={isFetching}
                    columns={tableColumns}
                    data={data?.items || []}
                    noDataCaption={t('users.eventsEmpty', 'Пользователь не посещал мероприятий')}
                />
            )}
        </Dialog>
    )
}

export default UserEventsDialog
