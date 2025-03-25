'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { Button } from 'simple-react-ui-kit'

import styles from './styles.module.sass'

import { API, ApiType } from '@/api'
import googleLogo from '@/public/images/google-logo.png'
import vkLogo from '@/public/images/vk-logo.png'
import yandexLogo from '@/public/images/yandex-logo.png'
import { LOCAL_STORAGE } from '@/tools/constants'
import useLocalStorage from '@/tools/hooks/useLocalStorage'

const LoginForm: React.FC = () => {
    const { t } = useTranslation()

    const router = useRouter()

    const [, setReturnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    // const [localeError, setLocaleError] = useState<string>('')

    const [
        authLoginService,
        {
            data: serviceData,
            isLoading: serviceLoading
            // isSuccess: serviceSuccess,
            // isError: serviceError
        }
    ] = API.useAuthLoginServiceMutation()

    const handleLoginServiceButton = (service: ApiType.Auth.AuthServiceType) => {
        setReturnPath(router.asPath)
        authLoginService({ service })
    }

    useEffect(() => {
        if (serviceData?.redirect && typeof window !== 'undefined') {
            window.location.href = serviceData.redirect
        }
    }, [serviceData?.redirect])

    return (
        <div className={styles.loginForm}>
            <p>{t('auth-description')}</p>
            <Button
                mode={'outline'}
                disabled={serviceLoading}
                onClick={() => handleLoginServiceButton('vk')}
            >
                <Image
                    src={vkLogo.src}
                    width={40}
                    height={40}
                    alt={''}
                />
            </Button>

            <Button
                mode={'outline'}
                disabled={serviceLoading}
                onClick={() => handleLoginServiceButton('google')}
            >
                <Image
                    src={googleLogo.src}
                    width={40}
                    height={40}
                    alt={''}
                />
            </Button>

            <Button
                mode={'outline'}
                disabled={serviceLoading}
                onClick={() => handleLoginServiceButton('yandex')}
            >
                <Image
                    src={yandexLogo.src}
                    width={40}
                    height={40}
                    alt={''}
                />
            </Button>
        </div>
    )
}

export default LoginForm
