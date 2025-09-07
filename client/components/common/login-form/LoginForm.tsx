'use client'

import React, { useEffect } from 'react'
import { Button, Message } from 'simple-react-ui-kit'

import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { API, ApiType } from '@/api'
import useLocalStorage from '@/hooks/useLocalStorage'
import googleLogo from '@/public/images/google-logo.png'
import vkLogo from '@/public/images/vk-logo.png'
import yandexLogo from '@/public/images/yandex-logo.png'
import { LOCAL_STORAGE } from '@/utils/constants'

import styles from './styles.module.sass'

interface LoginFormProps {
    onError?: (error?: ApiType.ResError) => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onError }) => {
    const { t } = useTranslation()

    const router = useRouter()

    const [, setReturnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    const [authLoginService, { data: serviceData, error, isLoading, isError }] = API.useAuthLoginServiceMutation()

    const handleLoginServiceButton = async (service: ApiType.Auth.AuthServiceType) => {
        setReturnPath(router.asPath)
        await authLoginService({ service })
    }

    useEffect(() => {
        if (serviceData?.redirect && typeof window !== 'undefined') {
            window.location.href = serviceData.redirect
        }
    }, [serviceData?.redirect])

    useEffect(() => {
        if (error) {
            onError?.(error as ApiType.ResError)
        }
    }, [error])

    return (
        <div className={styles.loginForm}>
            <p>
                {t(
                    'components.common.login-form.auth-description',
                    'Для авторизации на сайте используйте один из сервисов ниже'
                )}
            </p>

            {isError && <Message type={'error'}>{(error as ApiType.ResError)?.messages?.error || ''}</Message>}

            <div className={styles.buttons}>
                <Button
                    mode={'outline'}
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
        </div>
    )
}
