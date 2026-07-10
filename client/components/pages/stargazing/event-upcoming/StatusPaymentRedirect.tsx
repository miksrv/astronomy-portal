import React from 'react'
import { Button, cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

interface StatusPaymentRedirectProps {
    formUrl: string
}

export const StatusPaymentRedirect: React.FC<StatusPaymentRedirectProps> = ({ formUrl }) => {
    const { t } = useTranslation()

    return (
        <div className={styles.stateCard}>
            <div className={cn(styles.stateIcon, styles.stateIconPrimary)}>
                <Icon name={'External'} />
            </div>
            <h3 className={styles.stateHeading}>
                {t('components.pages.stargazing.event-upcoming.payment-redirect-title', 'Переход к оплате')}
            </h3>
            <p className={styles.stateText}>
                {t(
                    'components.pages.stargazing.event-upcoming.payment-redirect-text',
                    'Подождите, сейчас вы будете перенаправлены на страницу оплаты. Если переход не произошёл автоматически, нажмите на кнопку ниже.'
                )}
            </p>

            <Button
                className={styles.stateActionButton}
                mode={'primary'}
                onClick={() => {
                    window.location.href = formUrl
                }}
            >
                {t('components.pages.stargazing.event-upcoming.payment-redirect-button', 'Перейти к оплате')}
            </Button>
        </div>
    )
}
