import React from 'react'
import { Button, cn } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import LockIcon from '@/components/icons/LockIcon'

import styles from './styles.module.sass'

interface StatusLoginRequiredProps {
    onSignIn: () => void
}

export const StatusLoginRequired: React.FC<StatusLoginRequiredProps> = ({ onSignIn }) => {
    const { t } = useTranslation()

    return (
        <div className={styles.stateCard}>
            <div className={cn(styles.stateIcon, styles.stateIconPrimary)}>
                <LockIcon />
            </div>
            <h3 className={styles.stateHeading}>
                {t('components.pages.stargazing.event-upcoming.login-to-register', 'Войдите, чтобы зарегистрироваться')}
            </h3>
            <p className={styles.stateText}>
                {t(
                    'components.pages.stargazing.event-upcoming.login-to-register-hint',
                    'Для регистрации на астровыезд необходимо войти в аккаунт. Если у вас ещё нет аккаунта, вы сможете создать его после входа.'
                )}
            </p>

            <Button
                className={styles.stateActionButton}
                mode={'primary'}
                icon={'User'}
                onClick={onSignIn}
            >
                {t('components.pages.stargazing.event-upcoming.sign-in', 'Войти')}
            </Button>
        </div>
    )
}
