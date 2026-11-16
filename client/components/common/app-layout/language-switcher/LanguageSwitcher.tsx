import React, { useEffect } from 'react'
import { setCookie } from 'cookies-next'
import { cn } from 'simple-react-ui-kit'

import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { ApiType, setLocale, useAppDispatch } from '@/api'
import { LOCAL_STORAGE } from '@/utils/constants'
import * as LocalStorage from '@/utils/localstorage'

import styles from './styles.module.sass'

const LANGUAGES: Array<{ locale: ApiType.Locale; label: string }> = [
    { locale: 'ru', label: 'Ru' },
    { locale: 'en', label: 'En' }
]

export const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation()
    const router = useRouter()
    const dispatch = useAppDispatch()

    const { language: currentLanguage } = i18n
    const { pathname, asPath, query } = router

    const changeLanguage = async (locale: ApiType.Locale) => {
        if (locale === currentLanguage) {
            return
        }

        await setCookie('NEXT_LOCALE', locale)
        LocalStorage.setItem(LOCAL_STORAGE.LOCALE as 'LOCALE', locale)

        dispatch(setLocale(locale))

        await i18n.changeLanguage(locale)
        await router.push({ pathname, query }, asPath, { locale })
    }

    useEffect(() => {
        dispatch(setLocale(currentLanguage as ApiType.Locale))
    }, [currentLanguage, dispatch])

    return (
        <div className={styles.languageSwitcher}>
            {LANGUAGES.map(({ locale, label }, index) => (
                <React.Fragment key={locale}>
                    {index > 0 && <span className={styles.separator}>{'/'}</span>}
                    {currentLanguage === locale ? (
                        <span
                            className={cn(styles.langButton, styles.active)}
                            aria-current={'true'}
                        >
                            {label}
                        </span>
                    ) : (
                        // A real link, so crawlers find the other language version of the page;
                        // the click still goes through changeLanguage (cookie, store, i18n)
                        <Link
                            href={{ pathname, query }}
                            as={asPath}
                            locale={locale}
                            hrefLang={locale}
                            // Always on screen: prefetching the other locale on every page view
                            // would cost requests for a link that is rarely clicked
                            prefetch={false}
                            className={styles.langButton}
                            onClick={(event) => {
                                // Cmd/Ctrl/Shift/middle click: the browser opens the link itself
                                if (
                                    event.metaKey ||
                                    event.ctrlKey ||
                                    event.shiftKey ||
                                    event.altKey ||
                                    event.button !== 0
                                ) {
                                    return
                                }

                                event.preventDefault()
                                void changeLanguage(locale)
                            }}
                        >
                            {label}
                        </Link>
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}
