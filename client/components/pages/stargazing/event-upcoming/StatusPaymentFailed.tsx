import React from 'react'
import { Button, cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface StatusPaymentFailedProps {
    dateTime?: string
    location: string
    adults: number
    children: number
    childrenAges?: number[]
    amount: number
    isRetryError: boolean
    retryErrorMessage?: string
    isRetrying: boolean
    isLoading: boolean
    onRetryPayment: () => void
    onCancelRequest: () => void
}

export const StatusPaymentFailed: React.FC<StatusPaymentFailedProps> = ({
    dateTime,
    location,
    adults,
    children,
    childrenAges,
    amount,
    isRetryError,
    retryErrorMessage,
    isRetrying,
    isLoading,
    onRetryPayment,
    onCancelRequest
}) => {
    const { t } = useTranslation()

    return (
        <div className={styles.stateCard}>
            <div className={cn(styles.stateIcon, styles.stateIconDanger)}>
                <Icon name={'ReportError'} />
            </div>
            <h3 className={styles.stateHeading}>
                {t('components.pages.stargazing.event-upcoming.payment-failed-title', 'Оплата не прошла')}
            </h3>
            <p className={styles.stateText}>
                {t(
                    'components.pages.stargazing.event-upcoming.payment-failed-text',
                    'К сожалению, оплата не прошла. Место не забронировано. Вы можете попробовать оплатить снова или отменить заявку.'
                )}
            </p>

            <div className={styles.detailsCard}>
                <h4>{t('components.pages.stargazing.event-upcoming.booking-details-title', 'Детали заявки')}</h4>

                <div className={styles.detailsRow}>
                    <span>{t('components.pages.stargazing.event-upcoming.booking-details-date', 'Дата и время:')}</span>
                    <span className={styles.detailsValue}>{dateTime}</span>
                </div>

                <div className={styles.detailsRow}>
                    <span>{t('components.pages.stargazing.event-upcoming.booking-details-location', 'Место:')}</span>
                    <span className={styles.detailsValue}>{location}</span>
                </div>

                <div className={styles.detailsRow}>
                    <span>
                        {t('components.pages.stargazing.event-upcoming.booking-details-participants', 'Участников:')}
                    </span>
                    <span className={styles.detailsValue}>
                        {t(
                            'components.pages.stargazing.event-upcoming.members',
                            'Взрослых: {{adults}}, детей: {{children}}',
                            {
                                adults,
                                children
                            }
                        )}
                        {!!childrenAges?.length &&
                            ` (${childrenAges.join(', ')} ${t('components.pages.stargazing.event-upcoming.years-short', 'лет')})`}
                    </span>
                </div>

                <div className={styles.detailsRow}>
                    <span>{t('components.pages.stargazing.event-upcoming.booking-details-amount', 'Сумма:')}</span>
                    <span className={styles.detailsValue}>{`${amount} ₽`}</span>
                </div>
            </div>

            {isRetryError && (
                <p className={styles.notifyText}>
                    {retryErrorMessage ||
                        t(
                            'components.pages.stargazing.event-upcoming.retry-payment-error',
                            'Не удалось создать новую попытку оплаты. Попробуйте позже.'
                        )}
                </p>
            )}

            <div className={styles.failedPaymentActions}>
                <Button
                    mode={'primary'}
                    icon={'Rotate'}
                    loading={isRetrying}
                    disabled={isRetrying}
                    onClick={onRetryPayment}
                >
                    {t('components.pages.stargazing.event-upcoming.retry-payment', 'Попробовать оплатить снова')}
                </Button>

                <Button
                    mode={'secondary'}
                    loading={isLoading}
                    disabled={isLoading}
                    onClick={onCancelRequest}
                >
                    {t('components.pages.stargazing.event-upcoming.cancel-request', 'Отменить заявку')}
                </Button>
            </div>
        </div>
    )
}
