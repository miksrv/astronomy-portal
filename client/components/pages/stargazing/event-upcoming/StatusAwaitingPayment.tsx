import React from 'react'
import { Button, cn, Icon, Spinner } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface StatusAwaitingPaymentProps {
    isVerifyingPayment: boolean
    paymentTimeLeftLabel: string
    formUrl: string
    isLoading: boolean
    onCancelBooking: () => void
}

export const StatusAwaitingPayment: React.FC<StatusAwaitingPaymentProps> = ({
    isVerifyingPayment,
    paymentTimeLeftLabel,
    formUrl,
    isLoading,
    onCancelBooking
}) => {
    const { t } = useTranslation()

    if (isVerifyingPayment) {
        return (
            <div className={styles.verifyingPayment}>
                <Spinner style={{ height: 20, width: 20 }} />
                {t('components.pages.stargazing.event-upcoming.verifying-payment', 'Проверяем статус оплаты…')}
            </div>
        )
    }

    return (
        <div className={styles.stateCard}>
            <div className={cn(styles.stateIcon, styles.stateIconDanger)}>
                <Icon name={'Time'} />
            </div>
            <h3 className={styles.stateHeading}>
                {t('components.pages.stargazing.event-upcoming.awaiting-payment-title', 'Бронь ожидает оплаты')}
            </h3>
            <p className={styles.stateText}>
                {t(
                    'components.pages.stargazing.event-upcoming.awaiting-payment-text',
                    'Место забронировано. Завершите оплату до конца таймера, иначе бронь будет автоматически отменена и место освободится.'
                )}
            </p>
            <p className={styles.stateText}>
                <strong>
                    {t('components.pages.stargazing.event-upcoming.payment-time-left', 'Осталось на оплату: {{time}}', {
                        time: paymentTimeLeftLabel
                    })}
                </strong>
            </p>

            <div className={styles.awaitingPaymentActions}>
                <Button
                    mode={'primary'}
                    stretched={true}
                    onClick={() => {
                        window.location.href = formUrl
                    }}
                >
                    {t('components.pages.stargazing.event-upcoming.return-to-payment', 'Вернуться к оплате')}
                </Button>
                <Button
                    mode={'secondary'}
                    variant={'negative'}
                    stretched={true}
                    loading={isLoading}
                    disabled={isLoading}
                    onClick={onCancelBooking}
                >
                    {t('components.pages.stargazing.event-upcoming.cancel-booking', 'Отменить бронирование')}
                </Button>
            </div>
        </div>
    )
}
