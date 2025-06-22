import React, { useEffect } from 'react'
import { setCookie } from 'cookies-next'

import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { ApiType, useAppDispatch } from '@/api'
import { setLocale } from '@/api/applicationSlice'
import { LOCAL_STORAGE } from '@/tools/constants'
import useLocalStorage from '@/tools/hooks/useLocalStorage'

import styles from './styles.module.sass'

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation()
    const router = useRouter()
    const dispatch = useAppDispatch()

    const [, setStorageLocale] = useLocalStorage<string>(LOCAL_STORAGE.LOCALE)

    const { language: currentLanguage } = i18n
    const { pathname, asPath, query } = router

    const changeLanguage = async (locale: ApiType.Locale) => {
        if (locale === currentLanguage) {
            return
        }

        await setCookie('NEXT_LOCALE', locale)
        setStorageLocale(locale)

        dispatch(setLocale(locale))

        await i18n.changeLanguage(locale)
        await router.push({ pathname, query }, asPath, { locale })
    }

    useEffect(() => {
        dispatch(setLocale(currentLanguage as ApiType.Locale))
    }, [])

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

export default LanguageSwitcher
