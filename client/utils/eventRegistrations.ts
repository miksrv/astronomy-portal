import { ApiType } from '@/api'

// The booking status stored in `events_users.status`, with a soft-delete
// (`deletedAt`) collapsed into a synthetic 'canceled' value for display.
export type DisplayStatus = 'pending' | 'confirmed' | 'failed' | 'canceled'

// Merges the booking status with the payment status into a single status the
// admin sees in one place — 'canceled' additionally splits into a plain
// cancellation vs. one that already got its money back.
export type CombinedStatus = Exclude<DisplayStatus, 'canceled'> | 'canceled' | 'refunded'

// Display order shared by the registrations table legend and the statistic pie chart.
export const STATUS_ORDER: CombinedStatus[] = ['confirmed', 'pending', 'failed', 'canceled', 'refunded']

// Same colors as the table's status badges (see event-registrations-table/styles.module.sass),
// reused for the pie chart so both views stay visually consistent.
export const STATUS_COLORS: Record<CombinedStatus, string> = {
    canceled: '#cccccc',
    confirmed: '#2e7d32',
    failed: '#ff4444',
    pending: '#ff8c00',
    refunded: '#1976d2'
}

export const getDisplayStatus = (item: Pick<ApiType.Events.EventRegistration, 'status' | 'deletedAt'>): DisplayStatus =>
    (item.deletedAt ? 'canceled' : item.status) as DisplayStatus

export const getCombinedStatus = (
    item: Pick<ApiType.Events.EventRegistration, 'status' | 'deletedAt' | 'paymentStatus'>
): CombinedStatus => {
    const displayStatus = getDisplayStatus(item)

    if (displayStatus === 'canceled') {
        return item.paymentStatus === 'refunded' ? 'refunded' : 'canceled'
    }

    return displayStatus
}

export const getStatusLabel = (t: (key: string, fallback: string) => string, status: CombinedStatus): string => {
    const map: Record<CombinedStatus, string> = {
        canceled: t('pages.stargazing.registrations-status-canceled', 'Отменена'),
        confirmed: t('pages.stargazing.registrations-status-confirmed', 'Подтверждена'),
        failed: t('pages.stargazing.registrations-status-failed', 'Не оплачена'),
        pending: t('pages.stargazing.registrations-status-pending', 'Ожидает оплаты'),
        refunded: t('pages.stargazing.registrations-status-refunded', 'Возврат оформлен')
    }

    return map[status]
}
