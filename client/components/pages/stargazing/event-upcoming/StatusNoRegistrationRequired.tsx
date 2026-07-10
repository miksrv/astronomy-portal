import React from 'react'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

export const StatusNoRegistrationRequired: React.FC = () => {
    const { t } = useTranslation()

    return (
        <div className={styles.infoBlock}>
            <h3>
                {t('components.pages.stargazing.event-upcoming.no-registration-required', 'Регистрация не требуется')}
            </h3>
            <p>
                {t(
                    'components.pages.stargazing.event-upcoming.no-registration-required-hint',
                    'Просто приходите в указанное время — предварительная запись не нужна.'
                )}
            </p>
        </div>
    )
}
