import React, { useEffect, useState } from 'react'
import { Button, Input, Message } from 'simple-react-ui-kit'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiType } from '@/api'
import useLocalStorage from '@/hooks/useLocalStorage'
import googleLogo from '@/public/images/google-logo.png'
import vkLogo from '@/public/images/vk-logo.png'
import yandexLogo from '@/public/images/yandex-logo.png'
import { AUTH_GOOGLE_ENABLED, LOCAL_STORAGE } from '@/utils/constants'
import { getErrorMessage } from '@/utils/errors'

import styles from './styles.module.sass'

interface LoginFormProps {
    onError?: (error?: ApiType.ResError) => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const LoginForm: React.FC<LoginFormProps> = ({ onError }) => {
    const { t } = useTranslation()

    const router = useRouter()

    const [, setReturnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    const [email, setEmail] = useState<string>('')

    const [authLoginService, { data: serviceData, error, isLoading, isError }] = API.useAuthLoginServiceMutation()

    const [
        requestMagicLink,
        { data: magicLinkData, error: magicLinkError, isLoading: isMagicLinkLoading, isError: isMagicLinkError }
    ] = API.useAuthRequestMagicLinkMutation()

    const handleLoginServiceButton = async (service: ApiType.Auth.AuthServiceType) => {
        setReturnPath(router.asPath)
        await authLoginService({ service })
    }

    const isValidEmail = EMAIL_PATTERN.test(email.trim())

    const handleRequestMagicLink = async () => {
        if (!isValidEmail) {
            return
        }

        setReturnPath(router.asPath)

        const isValidReturnPath = router.asPath.startsWith('/') && !router.asPath.includes('://')

        await requestMagicLink({
            email: email.trim(),
            returnPath: isValidReturnPath ? router.asPath : undefined
        })
    }

    // Whitelist of trusted OAuth provider origins
    const OAUTH_ALLOWED_ORIGINS = [
        ...(AUTH_GOOGLE_ENABLED ? ['https://accounts.google.com'] : []),
        'https://oauth.yandex.com',
        'https://oauth.yandex.ru',
        'https://oauth.vk.com',
        'https://id.vk.com'
    ]

    useEffect(() => {
        if (serviceData?.redirect && typeof window !== 'undefined') {
            try {
                const url = new URL(serviceData.redirect)

                if (OAUTH_ALLOWED_ORIGINS.includes(url.origin)) {
                    window.location.href = serviceData.redirect
                }
            } catch {
                // Invalid URL — do not redirect
            }
        }
    }, [serviceData?.redirect])

    useEffect(() => {
        if (error) {
            onError?.(error as ApiType.ResError)
        }
    }, [error, onError])

    useEffect(() => {
        if (magicLinkError) {
            onError?.(magicLinkError as ApiType.ResError)
        }
    }, [magicLinkError, onError])

    if (magicLinkData?.sent) {
        return (
            <div className={styles.loginForm}>
                <p>
                    {t(
                        'components.common.login-form.magic-link-sent',
                        'Письмо со ссылкой для входа отправлено на {{email}}.',
                        { email }
                    )}
                </p>
                <p>
                    {t(
                        'components.common.login-form.magic-link-instructions',
                        'Перейдите по ссылке из письма — она действует 5 минут. Если письма нет, проверьте папку «Спам».'
                    )}
                </p>
            </div>
        )
    }

    return (
        <div className={styles.loginForm}>
            <p>{t('components.common.login-form.auth-description', 'Войдите по ссылке из письма или через сервис')}</p>

            {isMagicLinkError && <Message type={'error'}>{getErrorMessage(magicLinkError) || ''}</Message>}

            <div className={styles.emailRow}>
                <Input
                    type={'email'}
                    placeholder={t('components.common.login-form.email-placeholder', 'Ваш email')}
                    value={email}
                    disabled={isMagicLinkLoading}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            void handleRequestMagicLink()
                        }
                    }}
                />
                <Button
                    mode={'primary'}
                    loading={isMagicLinkLoading}
                    disabled={isMagicLinkLoading || !isValidEmail}
                    onClick={handleRequestMagicLink}
                >
                    {t('components.common.login-form.email-submit', 'Войти')}
                </Button>
            </div>

            <div className={styles.divider}>
                <span>{t('components.common.login-form.divider', 'или')}</span>
            </div>

            {isError && <Message type={'error'}>{getErrorMessage(error) || ''}</Message>}

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

                {AUTH_GOOGLE_ENABLED && (
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
                )}

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

            <p className={styles.consent}>
                {t(
                    'components.common.login-form.consent',
                    'Авторизуясь, вы соглашаетесь на обработку персональных данных и получение писем о ближайших астровыездах. Подробнее — в'
                )}
                <Link
                    style={{ marginLeft: '5px' }}
                    href={'/privacy'}
                    title={t('components.common.login-form.privacy-link', 'Политике конфиденциальности')}
                    target={'_blank'}
                >
                    {t('components.common.login-form.privacy-link', 'Политике конфиденциальности')}
                </Link>
                {'.'}
            </p>
        </div>
    )
}
