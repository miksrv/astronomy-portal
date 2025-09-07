import React, { useEffect, useState } from 'react'
import { Button, Container, Message, Spinner } from 'simple-react-ui-kit'

import { GetServerSidePropsResult, NextPage } from 'next'
import { useRouter } from 'next/dist/client/router'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { NextSeo } from 'next-seo'

import { API, ApiType, setLocale } from '@/api'
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
    const [returnPath] = useLocalStorage<string>(LOCAL_STORAGE.RETURN_PATH)

    const code = searchParams.get('code')
    const service = searchParams.get('service')

    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [sendRequest, setSendRequest] = useState<boolean>(false)

    const isAuth = useAppSelector((state) => state.auth.isAuth)

    const [serviceLogin, { data, error, isLoading, isError, isSuccess }] = API.useAuthLoginServiceMutation()

    useEffect(() => {
        if (isAuth && !data) {
            void router.push('/')
        }
    }, [])

    useEffect(() => {
        if (data?.auth === true && !isProcessing) {
            setIsProcessing(true)
            dispatch(login(data))

            if (returnPath) {
                const returnLink = returnPath

                LocalStorage.removeItem(LOCAL_STORAGE.RETURN_PATH as 'RETURN_PATH')

                void router.push(returnLink)
            } else {
                void router.push('/')
            }
        }
    }, [data])

    useEffect(() => {
        setSendRequest(true)

        if (sendRequest && !!code?.length && !!service?.length) {
            void serviceLogin({
                code,
                service: service as ApiType.Auth.AuthServiceType,
                state: searchParams.get('state') ?? undefined,
                device_id: searchParams.get('device_id') ?? undefined
            })
        }

        if ((!code || !service) && !sendRequest) {
            void router.push('/')
        }
    }, [sendRequest])

    return (
        <>
            <NextSeo
                nofollow={true}
                noindex={true}
                canonical={`${i18n.language === 'en' ? 'en/' : ''}auth`}
                title={t('pages.auth.title', 'Авторизация на сайте')}
            />
            <div className={'centerPageContainer'}>
                <div className={'wrapper'}>
                    <Container>
                        <h1 className={'header'}>{t('pages.auth.title', 'Авторизация на сайте')}</h1>
                        {error && (
                            <Message
                                type={'error'}
                                title={t('pages.auth.notification_error', 'Ошибка')}
                            >
                                {error as string}
                            </Message>
                        )}
                        {(isLoading || isSuccess || !isProcessing) && (
                            <div className={'loaderWrapper'}>
                                <Spinner />
                            </div>
                        )}
                        {isError && (
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
