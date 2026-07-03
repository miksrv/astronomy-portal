import React, { useMemo, useState } from 'react'
import { Badge, Button, Container, Input, Message, Table, TableColumnProps } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { API, ApiType } from '@/api'
import { formatDate } from '@/utils/dates'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

interface EventRegistrationsTableProps {
    eventId: string
}

type DisplayStatus = 'pending' | 'confirmed' | 'failed' | 'canceled'

type RegistrationRow = ApiType.Events.EventRegistration & { displayStatus: DisplayStatus }

const ALFABANK_TRANSACTION_URL = 'https://payment.alfabank.ru/generalmp3/admin/transactions/'

const STATUS_BADGE_CLASS: Record<DisplayStatus, string> = {
    canceled: styles.badgeCanceled,
    confirmed: styles.badgeConfirmed,
    failed: styles.badgeFailed,
    pending: styles.badgePending
}

const PAYMENT_BADGE_CLASS: Record<ApiType.Events.PaymentStatus, string> = {
    canceled: styles.badgeCanceled,
    failed: styles.badgeFailed,
    new: styles.badgePending,
    paid: styles.badgeConfirmed,
    pending: styles.badgePending,
    refunded: styles.badgeCanceled
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

    if (!registration.paymentOrderId) {
        return <span className={styles.noPayment}>{'—'}</span>
    }

    return (
        <div className={styles.verifyCell}>
            <Button
                size={'small'}
                mode={'outline'}
                loading={isLoading}
                onClick={() => void verifyPayment({ eventId, id: registration.id })}
            >
                {t('pages.stargazing.registrations-verify', 'Проверить транзакцию')}
            </Button>

            {data && <div className={styles.verifyResult}>{data.message}</div>}
            {error && <div className={styles.verifyError}>{getErrorMessage(error)}</div>}
        </div>
    )
}

export const EventRegistrationsTable: React.FC<EventRegistrationsTableProps> = ({ eventId }) => {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')

    const { data, isLoading, error } = API.useEventGetRegistrationsListQuery(eventId)
    const { data: event } = API.useEventGetItemQuery(eventId)

    const isPaidEvent = !!event?.ticketPrice && event.ticketPrice > 0

    const rows: RegistrationRow[] = useMemo(
        () =>
            (data?.items ?? []).map((item) => ({
                ...item,
                displayStatus: (item.deletedAt ? 'canceled' : item.status) as DisplayStatus
            })),
        [data]
    )

    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase()

        if (!query) {
            return rows
        }

        return rows.filter((row) => row.name?.toLowerCase().includes(query) || row.email?.toLowerCase().includes(query))
    }, [rows, search])

    const statusLabel = (status: DisplayStatus): string => {
        const map: Record<DisplayStatus, string> = {
            canceled: t('pages.stargazing.registrations-status-canceled', 'Отменена'),
            confirmed: t('pages.stargazing.registrations-status-confirmed', 'Подтверждена'),
            failed: t('pages.stargazing.registrations-status-failed', 'Не оплачена'),
            pending: t('pages.stargazing.registrations-status-pending', 'Ожидает оплаты')
        }

        return map[status]
    }

    const paymentStatusLabel = (status?: ApiType.Events.PaymentStatus): string => {
        const map: Record<ApiType.Events.PaymentStatus, string> = {
            canceled: t('pages.stargazing.registrations-payment-canceled', 'Отменён'),
            failed: t('pages.stargazing.registrations-payment-failed', 'Отклонён'),
            new: t('pages.stargazing.registrations-payment-new', 'Создан'),
            paid: t('pages.stargazing.registrations-payment-paid', 'Оплачен'),
            pending: t('pages.stargazing.registrations-payment-pending', 'В обработке'),
            refunded: t('pages.stargazing.registrations-payment-refunded', 'Возврат')
        }

        return status ? (map[status] ?? status) : '—'
    }

    const columns: Array<TableColumnProps<RegistrationRow>> = [
        {
            accessor: 'name',
            header: t('pages.stargazing.registrations-column-name', 'Имя'),
            isSortable: true
        },
        {
            accessor: 'email',
            header: t('pages.stargazing.registrations-column-email', 'Email')
        },
        {
            accessor: 'createdAt',
            formatter: (value) => formatDate(value as string, 'DD MMMM YYYY, HH:mm'),
            header: t('pages.stargazing.registrations-column-date', 'Дата регистрации'),
            isSortable: true
        },
        {
            accessor: 'displayStatus',
            formatter: (value) => (
                <Badge
                    label={statusLabel(value as DisplayStatus)}
                    size={'small'}
                    className={STATUS_BADGE_CLASS[value as DisplayStatus]}
                />
            ),
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
                      accessor: 'paymentStatus',
                      formatter: (value) =>
                          value ? (
                              <Badge
                                  label={paymentStatusLabel(value as ApiType.Events.PaymentStatus)}
                                  size={'small'}
                                  className={PAYMENT_BADGE_CLASS[value as ApiType.Events.PaymentStatus]}
                              />
                          ) : (
                              '—'
                          ),
                      header: t('pages.stargazing.registrations-column-payment-status', 'Статус транзакции'),
                      isSortable: true
                  },
                  {
                      accessor: 'id',
                      formatter: (_value, row, i) => (
                          <VerifyPaymentButton
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
                <h3 className={styles.title}>{t('pages.stargazing.registrations-title', 'Регистрации')}</h3>
                <Input
                    clearable={true}
                    value={search}
                    placeholder={t('pages.stargazing.registrations-search', 'Поиск по имени или email')}
                    onChange={(e) => setSearch(e.target.value)}
                    className={styles.search}
                />
            </div>

            {error && <Message type={'error'}>{getErrorMessage(error)}</Message>}

            {!error && (
                <Table<RegistrationRow>
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
