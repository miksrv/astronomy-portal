import React, { useMemo, useState } from 'react'
import { Badge, Button, Container, Input, Message, Select, Table, TableColumnProps } from 'simple-react-ui-kit'

import dynamic from 'next/dynamic'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiType } from '@/api'
import { formatDate } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'
import {
    CombinedStatus,
    DisplayStatus,
    getCombinedStatus,
    getDisplayStatus,
    getStatusLabel,
    STATUS_ORDER
} from '@/utils/eventRegistrations'

import styles from './styles.module.sass'

// Dialog uses a native <dialog> element — mounted client-side only, same
// convention as EventDeleteDialog/CancelRegistrationDialog, since this
// table's page renders via getServerSideProps.
const RefundRegistrationDialog = dynamic(
    () => import('./RefundRegistrationDialog').then((mod) => mod.RefundRegistrationDialog),
    { ssr: false }
)

interface EventRegistrationsTableProps {
    eventId: string
}

type RegistrationRow = ApiType.Events.EventRegistration & { displayStatus: DisplayStatus }

const ALFABANK_TRANSACTION_URL = 'https://payment.alfabank.ru/generalmp3/admin/transactions/'

const STATUS_BADGE_CLASS: Record<CombinedStatus, string> = {
    canceled: styles.badgeCanceled,
    confirmed: styles.badgeConfirmed,
    failed: styles.badgeFailed,
    pending: styles.badgePending,
    refunded: styles.badgeRefunded
}

const truncateOrderId = (orderId: string): string =>
    orderId.length > 14 ? `${orderId.slice(0, 8)}…${orderId.slice(-4)}` : orderId

interface VerifyPaymentButtonProps {
    eventId: string
    registration: RegistrationRow
}

const VerifyPaymentButton: React.FC<VerifyPaymentButtonProps> = ({ eventId, registration }) => {
    const { t } = useTranslation()
    const [verifyPayment, { data, isLoading, error }] = API.useEventVerifyRegistrationPaymentMutation()

    return (
        <div className={styles.verifyCell}>
            <Button
                size={'small'}
                mode={'outline'}
                loading={isLoading}
                onClick={() => void verifyPayment({ eventId, id: registration.id })}
            >
                {t('pages.stargazing.registrations-verify', 'Проверить')}
            </Button>

            {data && <div className={styles.verifyResult}>{data.message}</div>}
            {error && <div className={styles.verifyError}>{getErrorMessage(error)}</div>}
        </div>
    )
}

interface RefundButtonProps {
    eventId: string
    registration: RegistrationRow
}

/**
 * Force-refund trigger — only meaningful for a booking that's actually
 * confirmed, active, and paid; a pending/failed/already-cancelled/unpaid
 * registration has nothing to refund via this action (an unpaid pending
 * hold is released by the ordinary self-cancel flow instead).
 */
const RefundButton: React.FC<RefundButtonProps> = ({ eventId, registration }) => {
    const { t } = useTranslation()
    const [dialogOpen, setDialogOpen] = useState(false)

    const canRefund =
        registration.status === 'confirmed' && !registration.deletedAt && registration.paymentStatus === 'paid'

    if (!canRefund) {
        return null
    }

    return (
        <>
            <Button
                size={'small'}
                mode={'outline'}
                variant={'negative'}
                onClick={() => setDialogOpen(true)}
            >
                {t('pages.stargazing.registrations-refund', 'Возврат')}
            </Button>

            {dialogOpen && (
                <RefundRegistrationDialog
                    eventId={eventId}
                    registrationId={registration.id}
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                />
            )}
        </>
    )
}

interface RegistrationActionsProps {
    eventId: string
    registration: RegistrationRow
}

const RegistrationActions: React.FC<RegistrationActionsProps> = ({ eventId, registration }) => {
    if (!registration.paymentOrderId) {
        return <span className={styles.noPayment}>{'—'}</span>
    }

    return (
        <div className={styles.actionsCell}>
            <VerifyPaymentButton
                eventId={eventId}
                registration={registration}
            />

            <RefundButton
                eventId={eventId}
                registration={registration}
            />
        </div>
    )
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
            formatter: (_value, row, i) => (
                <div className={styles.participant}>
                    <div className={styles.participantName}>{row[i].name}</div>
                    <div className={styles.participantEmail}>{row[i].email}</div>
                </div>
            ),
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
            formatter: (_value, row, i) => `${row[i].adults} / ${row[i].children}`,
            header: t('pages.stargazing.registrations-column-members', 'Взрослые / Дети')
        },
        {
            accessor: 'displayStatus',
            formatter: (_value, row, i) => {
                const status = getCombinedStatus(row[i])

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
                      formatter: (_value, row, i) => (
                          <RegistrationActions
                              eventId={eventId}
                              registration={row[i]}
                          />
                      ),
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
