import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { getLocalizedTimeFromSec } from '@/utils/dates'

import styles from './styles.module.sass'

interface StatusRegistrationOpensInProps {
    secondsUntilStart: number
}

export const StatusRegistrationOpensIn: React.FC<StatusRegistrationOpensInProps> = ({ secondsUntilStart }) => {
    const { t } = useTranslation()

    return (
        <div className={styles.stateCard}>
            <div className={cn(styles.stateIcon, styles.stateIconPrimary)}>
                <Icon name={'Time'} />
            </div>
            <h3 className={styles.stateHeading}>
                {t(
                    'components.pages.stargazing.event-upcoming.registration-not-started-title',
                    'Регистрация ещё не началась'
                )}
            </h3>
            <p className={styles.stateText}>
                {t(
                    'components.pages.stargazing.event-upcoming.registration-not-started-text',
                    'Мы откроем запись на этот астровыезд немного позже. Возвращайтесь ближе к началу регистрации, чтобы успеть забронировать место.'
                )}
            </p>
            <p className={styles.stateText}>
                <strong>
                    {t(
                        'components.pages.stargazing.event-upcoming.registration-opens-in',
                        'Регистрация откроется через: {{time}}',
                        { time: getLocalizedTimeFromSec(secondsUntilStart, true, t) }
                    )}
                </strong>
            </p>
        </div>
    )
}
