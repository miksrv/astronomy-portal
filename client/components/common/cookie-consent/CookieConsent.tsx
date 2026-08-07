import React, { useEffect, useState } from 'react'
import { Button } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import { COOKIE_CONSENT_BANNER_ID, COOKIE_CONSENT_DISMISSED_EVENT, LOCAL_STORAGE } from '@/utils/constants'
import * as LocalStorage from '@/utils/localstorage'

import styles from './styles.module.sass'

export const CookieConsent: React.FC = () => {
    const { t } = useTranslation()

    const [visible, setVisible] = useState(false)

    useEffect(() => {
        setVisible(!LocalStorage.getItem(LOCAL_STORAGE.COOKIE_CONSENT as 'COOKIE_CONSENT'))
    }, [])

    const handleAccept = () => {
        LocalStorage.setItem(LOCAL_STORAGE.COOKIE_CONSENT as 'COOKIE_CONSENT', 'true')
        setVisible(false)

        // Lets other fixed/floating bottom UI (e.g. the review reminder) know
        // it can reclaim the space this banner used to occupy.
        window.dispatchEvent(new Event(COOKIE_CONSENT_DISMISSED_EVENT))
    }

    if (!visible) {
        return null
    }

    return (
        <div
            id={COOKIE_CONSENT_BANNER_ID}
            className={styles.cookieConsent}
            role={'region'}
            aria-label={t('components.common.cookie-consent.title', 'Уведомление об использовании cookies')}
        >
            <p className={styles.text}>
                {t(
                    'components.common.cookie-consent.text',
                    'Сайт использует cookies и собирает метрические данные для улучшения работы. Продолжая пользоваться сайтом, вы соглашаетесь с'
                )}
                <Link
                    href={'/privacy'}
                    className={styles.link}
                    title={t('pages.privacy.title', 'Политика конфиденциальности')}
                >
                    {t('components.common.cookie-consent.privacy-link', 'политикой конфиденциальности')}
                </Link>
                {'.'}
            </p>

            <Button
                mode={'primary'}
                size={'medium'}
                className={styles.button}
                label={t('components.common.cookie-consent.accept', 'Понятно')}
                onClick={handleAccept}
            />
        </div>
    )
}
