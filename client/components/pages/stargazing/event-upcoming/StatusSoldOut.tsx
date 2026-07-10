import React from 'react'
import { cn, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

export const StatusSoldOut: React.FC = () => {
    const { t } = useTranslation()

    return (
        <div className={styles.stateCard}>
            <div className={cn(styles.stateIcon, styles.stateIconDanger)}>
                <Icon name={'User'} />
            </div>
            <h3 className={styles.stateHeading}>
                {t('components.pages.stargazing.event-upcoming.no-tickets', 'Места закончились')}
            </h3>
            <p className={styles.stateText}>
                {t(
                    'components.pages.stargazing.event-upcoming.no-tickets-hint',
                    'На данный момент все места на астровыезд уже забронированы. Если кто-то отменит регистрацию, места появятся снова.'
                )}
            </p>

            <div className={styles.helpCard}>
                <h4>{t('components.pages.stargazing.event-upcoming.no-tickets-help-title', 'Что можно сделать')}</h4>
                <ul className={styles.helpList}>
                    <li>
                        <span className={styles.helpIcon}>
                            <Icon name={'Rotate'} />
                        </span>
                        {t(
                            'components.pages.stargazing.event-upcoming.no-tickets-help-1',
                            'Следите за обновлениями — места могут появиться в любой момент'
                        )}
                    </li>
                    <li>
                        <span className={styles.helpIcon}>
                            <Icon name={'Telegram'} />
                        </span>
                        <a
                            href={'https://t.me/look_at_stars'}
                            target={'_blank'}
                            rel={'noopener noreferrer'}
                        >
                            {t(
                                'components.pages.stargazing.event-upcoming.no-tickets-help-2',
                                'Подпишитесь на наши новости в Telegram'
                            )}
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    )
}
