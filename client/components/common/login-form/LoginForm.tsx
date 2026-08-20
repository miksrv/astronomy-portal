import React, { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button, Input, Message } from 'simple-react-ui-kit'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next/pages'

import { API, ApiType } from '@/api'
import useApiFormError from '@/hooks/useApiFormError'
import useLocalStorage from '@/hooks/useLocalStorage'
import useSyncApiFieldErrors from '@/hooks/useSyncApiFieldErrors'
import googleLogo from '@/public/images/google-logo.png'
import vkLogo from '@/public/images/vk-logo.png'
import yandexLogo from '@/public/images/yandex-logo.png'
import { AUTH_GOOGLE_ENABLED, LOCAL_STORAGE } from '@/utils/constants'

import styles from './styles.module.sass'

interface LoginFormProps {
    onError?: (error?: ApiType.ResError) => void
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface MagicLinkFormValues {
    email: string
}

export const LoginForm: React.FC<LoginFormProps> = ({ onError }) => {
    const { t } = useTranslation()

    const router = useRouter()

    const [, setReturnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    const [authLoginService, { data: serviceData, error, isLoading, isError }] = API.useAuthLoginServiceMutation()

    const [requestMagicLink, { data: magicLinkData, error: magicLinkError, isLoading: isMagicLinkLoading }] =
        API.useAuthRequestMagicLinkMutation()

    const magicLinkSchema = useMemo(
        () =>
            z.object({
                email: z
                    .string()
                    .trim()
                    .min(1, t('components.common.login-form.email-required', 'Введите email'))
                    .regex(EMAIL_PATTERN, t('components.common.login-form.email-invalid', 'Введите корректный email'))
            }),
        [t]
    )

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors: formErrors, isValid, isSubmitting }
    } = useForm<MagicLinkFormValues>({
        resolver: zodResolver(magicLinkSchema),
        mode: 'onChange',
        defaultValues: { email: '' }
    })

    const emailValue = useWatch({ control, name: 'email' })

    const { message: authErrorMessage } = useApiFormError(error)
    const { message: magicLinkMessage, fieldErrors: magicLinkFieldErrors } = useApiFormError(magicLinkError)
    useSyncApiFieldErrors(magicLinkFieldErrors, setError)

    const handleLoginServiceButton = async (service: ApiType.Auth.AuthServiceType) => {
        setReturnPath(router.asPath)
        await authLoginService({ service })
    }

    const onSubmitMagicLink = async ({ email }: MagicLinkFormValues) => {
        setReturnPath(router.asPath)

        const isValidReturnPath = router.asPath.startsWith('/') && !router.asPath.includes('://')

        await requestMagicLink({
            email,
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
                        { email: emailValue }
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

            {magicLinkMessage && <Message type={'error'}>{magicLinkMessage}</Message>}

            <form
                className={styles.emailRow}
                onSubmit={handleSubmit(onSubmitMagicLink)}
                noValidate={true}
            >
                <Controller
                    name={'email'}
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            type={'email'}
                            placeholder={t('components.common.login-form.email-placeholder', 'Ваш email')}
                            disabled={isMagicLinkLoading || isSubmitting}
                            error={formErrors.email?.message}
                        />
                    )}
                />
                <Button
                    type={'submit'}
                    mode={'primary'}
                    loading={isMagicLinkLoading || isSubmitting}
                    disabled={isMagicLinkLoading || isSubmitting || !isValid}
                >
                    {t('components.common.login-form.email-submit', 'Войти')}
                </Button>
            </form>

            <div className={styles.divider}>
                <span>{t('components.common.login-form.divider', 'или')}</span>
            </div>

            {isError && <Message type={'error'}>{authErrorMessage || ''}</Message>}

            <div className={styles.buttons}>
                <Button
                    mode={'outline'}
                    disabled={isLoading}
                    onClick={() => handleLoginServiceButton('vk')}
                    aria-label={t('components.common.login-form.vk-login', 'Войти через VK')}
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
                        aria-label={t('components.common.login-form.google-login', 'Войти через Google')}
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
                    aria-label={t('components.common.login-form.yandex-login', 'Войти через Яндекс')}
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
