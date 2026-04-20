import React, { useEffect } from 'react'
import { setCookie } from 'cookies-next'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { ApiType, setLocale, useAppDispatch } from '@/api'
import { LOCAL_STORAGE } from '@/utils/constants'
import * as LocalStorage from '@/utils/localstorage'

import styles from './styles.module.sass'

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
            {currentLanguage === 'ru' && (
                <button
                    className={styles.active}
                    onClick={() => changeLanguage('en')}
                >
                    {'Eng'}
                </button>
            )}

            {currentLanguage === 'en' && (
                <button
                    className={styles.active}
                    onClick={() => changeLanguage('ru')}
                >
                    {'Rus'}
                </button>
            )}
        </div>
    )
}
