import React, { useEffect, useState } from 'react'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/dist/client/router'
import Head from 'next/head'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'next-i18next/pages'
import { serverSideTranslations } from 'next-i18next/pages/serverSideTranslations'
import { generateNextSeo } from 'next-seo/pages'

import { API, ApiType, setLocale, SITE_LINK } from '@/api'
import { login } from '@/api/authSlice'
import { useAppDispatch, useAppSelector, wrapper } from '@/api/store'
import useLocalStorage from '@/hooks/useLocalStorage'
import { LOCAL_STORAGE } from '@/utils/constants'
import * as LocalStorage from '@/utils/localstorage'

type AuthPageProps = object

const AuthPage: NextPage<AuthPageProps> = () => {
    const { t, i18n } = useTranslation()

    const dispatch = useAppDispatch()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [returnPath, setReturnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    const code = searchParams.get('code')
    const service = searchParams.get('service')
    const token = searchParams.get('token')
    const returnQueryParam = searchParams.get('return')

    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [sendRequest, setSendRequest] = useState<boolean>(false)
    const [isMagicProcessing, setIsMagicProcessing] = useState<boolean>(false)
    const [sendMagicRequest, setSendMagicRequest] = useState<boolean>(false)

    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const [serviceLogin, { data, error, isLoading, isError, isSuccess }] = API.useAuthLoginServiceMutation()

    const [
        verifyMagicLink,
        {
            data: magicData,
            error: magicError,
            isLoading: isMagicLoading,
            isError: isMagicError,
            isSuccess: isMagicSuccess
        }
    ] = API.useAuthVerifyMagicLinkMutation()

    useEffect(() => {
        if (isAuth && !data && !magicData) {
            void router.push('/')
        }
    }, [isAuth, data, magicData, router])

    useEffect(() => {
        if (data?.auth === true && !isProcessing) {
            setIsProcessing(true)
            dispatch(login(data))

            if (returnPath) {
                // Validate returnPath: must be relative (starts with '/' and no '://')
                const isValidPath =
                    typeof returnPath === 'string' && returnPath.startsWith('/') && !returnPath.includes('://')

                const returnLink = isValidPath ? returnPath : '/'

                LocalStorage.removeItem(LOCAL_STORAGE.RETURN_PATH as 'RETURN_PATH')

                void router.push(returnLink)
            } else {
                void router.push('/')
            }
        }
    }, [data, isProcessing, returnPath, dispatch, router])

    // Magic-link (passwordless email) login. Kept fully separate from the
    // code/service (OAuth) flow above — the two are mutually exclusive based
    // on which query params are present, and never touch each other's state.
    useEffect(() => {
        if (magicData?.auth === true && !isMagicProcessing) {
            setIsMagicProcessing(true)
            dispatch(login(magicData))

            // The return path travels in the emailed link itself (query param),
            // not localStorage — the link may be opened on a different device
            // or browser than the one that requested it.
            const isValidReturn =
                typeof returnQueryParam === 'string' &&
                returnQueryParam.startsWith('/') &&
                !returnQueryParam.includes('://')

            const returnLink = isValidReturn ? returnQueryParam : '/'

            if (magicData.isNewUser) {
                // Stash it under the same key the OAuth flow uses, so the
                // profile onboarding step's save/skip button can redirect
                // there afterward via the same mechanism.
                setReturnPath(returnLink)
                void router.push('/profile?onboarding=1')
            } else {
                void router.push(returnLink)
            }
        }
    }, [magicData, isMagicProcessing, returnQueryParam, dispatch, router, setReturnPath])

    useEffect(() => {
        if (token || sendRequest) {
            return
        }

        if (!code || !service) {
            void router.push('/')

            return
        }

        setSendRequest(true)

        // OAuth codes are single-use. Scrub them from the address bar right away so a
        // page refresh, browser back/forward, or a dev-only Strict Mode re-render can
        // never resubmit an already-consumed code to the provider.
        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '/auth')
        }

        void serviceLogin({
            code,
            service: service as ApiType.Auth.AuthServiceType,
            state: searchParams.get('state') ?? undefined,
            device_id: searchParams.get('device_id') ?? undefined
        })
    }, [token, code, service, sendRequest, serviceLogin, searchParams, router])

    useEffect(() => {
        if (!token) {
            return
        }

        if (!sendMagicRequest) {
            setSendMagicRequest(true)
            void verifyMagicLink({ token })
        }
    }, [token, sendMagicRequest, verifyMagicLink])

    const showError = token ? isMagicError && magicError : error
    const showSpinner = token
        ? isMagicLoading || isMagicSuccess || !isMagicProcessing
        : isLoading || isSuccess || !isProcessing
    const showHomeButton = token ? isMagicError : isError

    return (
        <>
            <Head>
                {generateNextSeo({
                    nofollow: true,
                    noindex: true,
                    canonical: `${SITE_LINK}${i18n.language === 'en' ? 'en/' : ''}auth`,
                    title: t('pages.auth.title', 'Авторизация на сайте')
                })}
            </Head>
            <div className={'centerPageContainer'}>
                <div className={'wrapper'}>
                    <Container>
                        <h1 className={'header'}>{t('pages.auth.title', 'Авторизация на сайте')}</h1>
                        {showError && (
                            <Message
                                type={'error'}
                                title={t('pages.auth.notification_error', 'Ошибка')}
                            >
                                {token
                                    ? (magicError as ApiType.ResError)?.messages?.error ||
                                      t('pages.auth.magic-link-error', 'Ссылка для входа недействительна или истекла')
                                    : (error as string)}
                            </Message>
                        )}
                        {showSpinner && (
                            <div className={'loaderWrapper'}>
                                <Spinner />
                            </div>
                        )}
                        {showHomeButton && (
                            <Button
                                link={'/'}
                                size={'medium'}
                                mode={'primary'}
                            >
                                {t('pages.auth.go-to-home-page', 'Перейти на главную страницу')}
                            </Button>
                        )}
                    </Container>
                </div>
            </div>
        </>
    )
}

export const getServerSideProps = wrapper.getServerSideProps(
    (store) =>
        async (context): Promise<GetServerSidePropsResult<AuthPageProps>> => {
            const locale = (context.locale ?? 'en') as ApiType.Locale
            const translations = await serverSideTranslations(locale)

            store.dispatch(setLocale(locale))

            return {
                props: {
                    ...translations
                }
            }
        }
)

export default AuthPage
