import React, { useEffect, useRef, useState } from 'react'
import { Button } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useTranslation } from 'next-i18next/pages'

import {
    COOKIE_CONSENT_BANNER_ID,
    COOKIE_CONSENT_DISMISSED_EVENT,
    COOKIE_CONSENT_HEIGHT_CSS_VAR,
    LOCAL_STORAGE
} from '@/utils/constants'
import * as LocalStorage from '@/utils/localstorage'

import styles from './styles.module.sass'

export const CookieConsent: React.FC = () => {
    const { t } = useTranslation()

    const [visible, setVisible] = useState(false)
    const bannerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setVisible(!LocalStorage.getItem(LOCAL_STORAGE.COOKIE_CONSENT as 'COOKIE_CONSENT'))
    }, [])

    // Publish the banner's rendered height as a CSS variable on <html> while it is
    // shown (it wraps to more lines on narrow screens, so a fixed value won't do), and
    // reset it to 0px once dismissed/unmounted — viewport-sized layouts subtract it so
    // their bottom controls are never hidden behind the banner.
    useEffect(() => {
        const banner = bannerRef.current
        const root = document.documentElement

        if (!visible || !banner) {
            root.style.setProperty(COOKIE_CONSENT_HEIGHT_CSS_VAR, '0px')
            return
        }

        const publishHeight = () => {
            root.style.setProperty(COOKIE_CONSENT_HEIGHT_CSS_VAR, `${banner.offsetHeight}px`)
        }

        publishHeight()

        const observer = new ResizeObserver(publishHeight)
        observer.observe(banner)

        return () => {
            observer.disconnect()
            root.style.setProperty(COOKIE_CONSENT_HEIGHT_CSS_VAR, '0px')
        }
    }, [visible])

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
            ref={bannerRef}
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
