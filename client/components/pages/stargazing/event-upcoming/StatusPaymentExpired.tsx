import React from 'react'
import { Button, cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface StatusPaymentExpiredProps {
    hasError: boolean
    errorMessage?: string
    isLoading: boolean
    onReregister: () => void
}

export const StatusPaymentExpired: React.FC<StatusPaymentExpiredProps> = ({
    hasError,
    errorMessage,
    isLoading,
    onReregister
}) => {
    const { t } = useTranslation()

    return (
        <div className={styles.stateCard}>
            <div className={cn(styles.stateIcon, styles.stateIconDanger)}>
                <Icon name={'ReportError'} />
            </div>
            <h3 className={styles.stateHeading}>
                {t('components.pages.stargazing.event-upcoming.payment-expired-title', 'Время на оплату истекло')}
            </h3>
            <p className={styles.stateText}>
                {t(
                    'components.pages.stargazing.event-upcoming.payment-expired-text',
                    'Ваша бронь была снята. Пожалуйста, нажмите кнопку ниже, чтобы зарегистрироваться заново.'
                )}
            </p>

            {hasError && (
                <p className={styles.notifyText}>
                    {errorMessage ||
                        t(
                            'components.pages.stargazing.event-upcoming.reregister-error',
                            'Не удалось оформить новую попытку. Попробуйте позже.'
                        )}
                </p>
            )}

            <Button
                className={styles.stateActionButton}
                mode={'primary'}
                loading={isLoading}
                disabled={isLoading}
                onClick={onReregister}
            >
                {t('components.pages.stargazing.event-upcoming.reregister', 'Зарегистрироваться заново')}
            </Button>
        </div>
    )
}
