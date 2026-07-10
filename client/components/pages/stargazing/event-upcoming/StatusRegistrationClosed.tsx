import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

export const StatusRegistrationClosed: React.FC = () => {
    const { t } = useTranslation()

    return (
        <div className={styles.stateCard}>
            <div className={cn(styles.stateIcon, styles.stateIconDanger)}>
                <Icon name={'Close'} />
            </div>
            <h3 className={styles.stateHeading}>
                {t(
                    'components.pages.stargazing.event-upcoming.registration-closed',
                    'Регистрация на астровыезд завершена'
                )}
            </h3>
            <p className={styles.stateText}>
                {t(
                    'components.pages.stargazing.event-upcoming.registration-closed-hint',
                    'Пожалуйста дождитесь нашего следующего астровыезда, что бы его не пропустить - подпишитесь на Telegram канал'
                )}
            </p>
        </div>
    )
}
