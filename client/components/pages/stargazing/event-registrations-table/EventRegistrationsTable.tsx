import React, { useMemo, useState } from 'react'
import { Badge, Container, Input, Message, Select, Table, TableColumnProps } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API } from '@/api'
import { formatDate } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'
import {
    CombinedStatus,
    getCombinedStatus,
    getDisplayStatus,
    getStatusLabel,
    STATUS_ORDER
} from '@/utils/eventRegistrations'

import { RegistrationActions } from './RegistrationActions'
import { ALFABANK_TRANSACTION_URL, EventRegistrationsTableProps, RegistrationRow } from './types'
import { truncateOrderId } from './utils'

import styles from './styles.module.sass'

const STATUS_BADGE_CLASS: Record<CombinedStatus, string> = {
    canceled: styles.badgeCanceled ?? '',
    confirmed: styles.badgeConfirmed ?? '',
    failed: styles.badgeFailed ?? '',
    pending: styles.badgePending ?? '',
    refunded: styles.badgeRefunded ?? ''
}

export const EventRegistrationsTable: React.FC<EventRegistrationsTableProps> = ({ eventId }) => {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<CombinedStatus | undefined>()

    const { data, isLoading, error } = API.useEventGetRegistrationsListQuery(eventId)
    const { data: event } = API.useEventGetItemQuery(eventId)

    const isPaidEvent = !!event?.ticketPrice && event.ticketPrice > 0

    const statusOptions = STATUS_ORDER.map((status) => ({
        key: status,
        value: getStatusLabel(t, status)
    }))

    const rows: RegistrationRow[] = useMemo(
        () =>
            (data?.items ?? []).map((item) => ({
                ...item,
                displayStatus: getDisplayStatus(item)
            })),
        [data]
    )

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase()

        return rows
            .filter((row) => !statusFilter || getCombinedStatus(row) === statusFilter)
            .filter(
                (row) => !query || row.name?.toLowerCase().includes(query) || row.email?.toLowerCase().includes(query)
            )
    }, [rows, search, statusFilter])

    const columns: Array<TableColumnProps<RegistrationRow>> = [
        {
            accessor: 'name',
            formatter: (_value, row, i) => {
                const item = row[i]

                if (!item) {
                    return null
                }

                return (
                    <div className={styles.participant}>
                        <div className={styles.participantName}>{item.name}</div>
                        <div className={styles.participantEmail}>{item.email}</div>
                    </div>
                )
            },
            header: t('pages.stargazing.registrations-column-participant', 'Участник'),
            isSortable: true
        },
        {
            accessor: 'createdAt',
            className: styles.nowrap,
            formatter: (value) => formatDate(value as string, 'DD MMMM YYYY, HH:mm'),
            header: t('pages.stargazing.registrations-column-date', 'Дата регистрации'),
            isSortable: true
        },
        {
            accessor: 'adults',
            formatter: (_value, row, i) => {
                const item = row[i]

                return item ? `${item.adults} / ${item.children}` : ''
            },
            header: t('pages.stargazing.registrations-column-members', 'Взрослые / Дети')
        },
        {
            accessor: 'displayStatus',
            formatter: (_value, row, i) => {
                const item = row[i]

                if (!item) {
                    return null
                }

                const status = getCombinedStatus(item)

                return (
                    <Badge
                        label={getStatusLabel(t, status)}
                        size={'small'}
                        className={STATUS_BADGE_CLASS[status]}
                    />
                )
            },
            header: t('pages.stargazing.registrations-column-status', 'Статус'),
            isSortable: true
        },
        ...(isPaidEvent
            ? ([
                  {
                      accessor: 'paymentOrderId',
                      formatter: (value) =>
                          value ? (
                              <a
                                  href={`${ALFABANK_TRANSACTION_URL}${value as string}`}
                                  target={'_blank'}
                                  rel={'noopener noreferrer'}
                              >
                                  {truncateOrderId(value as string)}
                              </a>
                          ) : (
                              '—'
                          ),
                      header: t('pages.stargazing.registrations-column-order', 'ID транзакции'),
                      isSortable: true
                  },
                  {
                      accessor: 'id',
                      formatter: (_value, row, i) => {
                          const item = row[i]

                          return item ? (
                              <RegistrationActions
                                  eventId={eventId}
                                  registration={item}
                              />
                          ) : null
                      },
                      header: t('pages.stargazing.registrations-column-action', 'Действие')
                  }
              ] as Array<TableColumnProps<RegistrationRow>>)
            : [])
    ]

    return (
        <Container className={styles.wrapper}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h3 className={styles.title}>{t('pages.stargazing.registrations-title', 'Регистрации')}</h3>
                    <div className={styles.subtitle}>
                        {t('pages.stargazing.registrations-count', '{{count}} регистраций', {
                            count: filteredRows.length
                        })}
                    </div>
                </div>
                <div className={styles.filters}>
                    <Input
                        clearable={true}
                        value={search}
                        placeholder={t('pages.stargazing.registrations-search', 'Поиск по имени или email')}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.search}
                    />
                    <Select<CombinedStatus>
                        clearable={true}
                        options={statusOptions}
                        value={statusFilter}
                        placeholder={t('pages.stargazing.registrations-filter-status', 'Все статусы')}
                        onSelect={(selected) => setStatusFilter(selected?.[0]?.key)}
                        className={styles.statusFilter}
                    />
                </div>
            </div>

            {error && <Message type={'error'}>{getErrorMessage(error)}</Message>}

            {!error && (
                <Table<RegistrationRow>
                    className={styles.table}
                    size={'small'}
                    data={filteredRows}
                    columns={columns}
                    loading={isLoading}
                    maxHeight={400}
                    stickyHeader={true}
                    defaultSort={{ key: 'createdAt', direction: 'desc' }}
                    noDataCaption={t('pages.stargazing.registrations-empty', 'Нет регистраций')}
                />
            )}
        </Container>
    )
}
